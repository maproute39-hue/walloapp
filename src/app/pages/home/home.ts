import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PbService } from '../../services/pb.service';
import { PocketbaseService } from '@app/services/pocketbase.service';
type Role = 'client' | 'professional';
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})

export class HomeComponent implements OnInit, OnDestroy {
  loading: boolean = false;
  professionalZipsCount: number = 0;
  private newRequestIds: Set<string> = new Set(); // Para marcar requests nuevas en tiempo real


  userId: string = ''; // Usuario simulado para pruebas
  userRequests: any[] = [];
  private unsubscribe: (() => void) | null = null;
  currentUser: any;
  constructor(
    private pocketbaseService: PocketbaseService,
    private pbService: PbService) { }

async ngOnInit(): Promise<void> {
  this.currentUser = this.pocketbaseService.getCurrentUser();

  if (this.currentUser?.['type'] === 'client') {
    await this.loadClientRequests();
    await this.subscribeToClientRequests();
  } else if (this.currentUser?.['type'] === 'professional') {
    await this.loadProfessionalRequests();
    await this.subscribeToProfessionalRequests();
  }
}

private async loadClientRequests(): Promise<void> {
  try {
    const records = await this.pbService.pb.collection('requests').getList(1, 50, {
      filter: `client_id="${this.currentUser.id}"`,
      sort: '-created'
    });
    this.userRequests = records.items;
    console.log('Solicitudes del cliente cargadas:', this.userRequests);
  } catch (error) {
    console.error('Error loading client requests:', error);
  }
}

private async subscribeToClientRequests(): Promise<void> {
  this.unsubscribe = await this.pbService.pb.collection('requests').subscribe('*', (e) => {
    console.log('Cambio en solicitudes del cliente:', e.action, e.record);

    if (e.record['client_id'] === this.currentUser.id) {
      if (e.action === 'create') {
        this.userRequests.unshift(e.record);
      } else if (e.action === 'update') {
        const index = this.userRequests.findIndex(r => r.id === e.record.id);
        if (index !== -1) {
          this.userRequests[index] = e.record;
        }
      } else if (e.action === 'delete') {
        this.userRequests = this.userRequests.filter(r => r.id !== e.record.id);
      }
    }
  }, {
    filter: `client_id="${this.currentUser.id}"`
  });
}

private async loadProfessionalRequests(): Promise<void> {
  this.loading = true;
  try {
    // 1. Obtener el perfil del profesional EXPANDIENDO service_zips
    const profile = await this.pbService.pb.collection('professional_profiles').getFirstListItem(
      `userId="${this.currentUser.id}"`,
      { expand: 'service_zips' }  // ¡IMPORTANTE: expandir la relación!
    );
    
    const serviceZipIds = profile.expand?.['service_zips'] || [];
    this.professionalZipsCount = serviceZipIds.length;
    
    if (serviceZipIds.length === 0) {
      this.userRequests = [];
      console.log('El profesional no tiene service_zips configurados');
      return;
    }

    // 2. Extraer los VALORES de zip_code (ej: "27515") desde los objetos expandidos
    // Asumiendo que la colección zipcodes tiene un campo llamado "code" o "zip_code"
    const professionalZipCodes = serviceZipIds.map((zip: any) => {
      // Ver qué campo tiene el valor del zip code en tu colección zipcodes
      return zip.code || zip.zip_code || zip.name; 
    });
    
    console.log('Zip codes del profesional (VALORES):', professionalZipCodes);
    
    // 3. Construir filtro con los VALORES de texto
    const zipFilters = professionalZipCodes.map((code: string) => `zip_code="${code}"`).join('||');
    
    const filterQuery = `(${zipFilters}) && client_id != "${this.currentUser.id}" && status = "sent"`;
    console.log('Filtro:', filterQuery);
    
    const records = await this.pbService.pb.collection('requests').getList(1, 50, {
      filter: filterQuery,
      sort: '-created'
    });
    
    this.userRequests = records.items;
    console.log('Requests encontradas:', this.userRequests);
    console.log('Total:', records.totalItems);
    
  } catch (error) {
    console.error('Error loading professional requests:', error);
  } finally {
    this.loading = false;
  }
}
    isNewRequest(request: any): boolean {
    return this.newRequestIds.has(request.id);
  }
  

 private async subscribeToProfessionalRequests(): Promise<void> {
  try {
    const profile = await this.pbService.pb.collection('professional_profiles').getFirstListItem(
      `userId="${this.currentUser.id}"`,
      { expand: 'service_zips' }
    );
    
    const serviceZipIds = profile.expand?.['service_zips'] || [];
    if (serviceZipIds.length === 0) return;

    const professionalZipCodes = new Set(
      serviceZipIds.map((zip: any) => zip.code || zip.zip_code || zip.name)
    );
    
    console.log('Profesional suscrito a zip codes:', Array.from(professionalZipCodes));

    // Suscribirse a TODOS los cambios en requests (sin filtro de status)
    this.unsubscribe = await this.pbService.pb.collection('requests').subscribe('*', (e) => {
      const requestZipCode = e.record['zip_code'];
      const isMatchingZip = professionalZipCodes.has(requestZipCode);
      const isNotOwnRequest = e.record['client_id'] !== this.currentUser.id;
      const isSentStatus = e.record['status'] === 'sent';
      
      // Solo procesar si coincide el zip y no es propia
      if (isMatchingZip && isNotOwnRequest) {
        console.log(`🔔 Cambio detectado: ${e.action} - Status: ${e.record['status']} - Zip: ${requestZipCode}`);
        
        if (e.action === 'create') {
          // Nueva request - solo mostrar si está "sent"
          if (isSentStatus) {
            this.newRequestIds.add(e.record.id);
            this.userRequests.unshift(e.record);
            setTimeout(() => this.newRequestIds.delete(e.record.id), 30000);
            console.log('✅ Nueva request "sent" agregada');
          }
        } 
        else if (e.action === 'update') {
          const index = this.userRequests.findIndex(r => r.id === e.record.id);
          
          if (isSentStatus) {
            // Si el status es "sent"
            if (index !== -1) {
              // Ya está en la lista - actualizar
              this.userRequests[index] = e.record;
              console.log('🔄 Request actualizada en la lista');
            } else {
              // No está en la lista - agregar (cambió a "sent" desde otro estado)
              this.userRequests.unshift(e.record);
              console.log('➕ Request cambió a "sent" - agregada');
            }
          } else {
            // Si el status NO es "sent"
            if (index !== -1) {
              // Estaba en la lista - remover (cambió de "sent" a otro estado)
              this.userRequests.splice(index, 1);
              console.log('➖ Request ya no es "sent" - removida');
            }
          }
        } 
        else if (e.action === 'delete') {
          // Eliminar de la lista si existe
          this.userRequests = this.userRequests.filter(r => r.id !== e.record.id);
          console.log('🗑️ Request eliminada');
        }
      }
    });
    
  } catch (error) {
    console.error('Error subscribing to professional requests:', error);
  }
}

  ngOnDestroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }


  

  private async loadUserRequests(): Promise<void> {
    try {
      // Cargar solicitudes iniciales del usuario usando el índice client_id
      const records = await this.pbService.pb.collection('requests').getList(1, 50, {
        filter: `client_id="${this.pocketbaseService.getCurrentUser()?.id}"`,
        sort: '-created'
      });
      this.userRequests = records.items;
      console.log('Solicitudes cargadas:', this.userRequests);
    } catch (error) {
      console.error('Error loading user requests:', error);
    }
  }

  private async subscribeToUserRequests(): Promise<void> {
    // Suscribirse a cambios en tiempo real para las solicitudes del usuario
    this.unsubscribe = await this.pbService.pb.collection('requests').subscribe('*', (e) => {
      console.log('Cambio en solicitudes:', e.action, e.record);

      if (e.record['client_id'] === this.pocketbaseService.getCurrentUser()?.id) {
        if (e.action === 'create') {
          this.userRequests.unshift(e.record);
        } else if (e.action === 'update') {
          const index = this.userRequests.findIndex(r => r.id === e.record.id);
          if (index !== -1) {
            this.userRequests[index] = e.record;
          }
        } else if (e.action === 'delete') {
          this.userRequests = this.userRequests.filter(r => r.id !== e.record.id);
        }
      }
    }, {
      filter: `client_id="${this.pocketbaseService.getCurrentUser()?.id}"`
    });
  }
}
