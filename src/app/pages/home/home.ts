import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import Swal from 'sweetalert2';  // ← AGREGAR ESTE IMPORT

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
  leadPrice: number = 4.99;
  professionalCreditBalance: number = 0;
  // private newRequestIds: Set<string> = new Set();
  private updatedRequestIds: Set<string> = new Set();  // ← ESTA ES LA QUE FALTA

  userId: string = ''; // Usuario simulado para pruebas
  userRequests: any[] = [];
  private unsubscribe: (() => void) | null = null;
  currentUser: any;
  constructor(
    private pocketbaseService: PocketbaseService,
    private pbService: PbService) { }

  async ngOnInit(): Promise<void> {
    this.currentUser = this.pocketbaseService.getCurrentUser();

    if (this.currentUser?.['type'] === 'professional') {
      await this.loadProfessionalCreditBalance();
      await this.loadProfessionalRequests();
      await this.subscribeToProfessionalRequests();
    } else if (this.currentUser?.['type'] === 'client') {
      await this.loadClientRequests();
      await this.subscribeToClientRequests();
    }
  }
  // Obtener cupos restantes
  getSpotsLeft(request: any): number {
    const soldLeads = request.interested_professionals?.length || 0;
    return Math.max(0, 3 - soldLeads);
  }

  // Obtener leads vendidos
  getSoldLeads(request: any): number {
    return request.interested_professionals?.length || 0;
  }

  // Verificar si ya compró este lead
  hasPurchasedLead(request: any): boolean {
    return request.interested_professionals?.includes(this.currentUser.id) || false;
  }

 async purchaseLead(request: any): Promise<void> {
  if (this.professionalCreditBalance < this.leadPrice) {
    await Swal.fire({
      icon: 'warning',
      title: 'Créditos insuficientes',
      text: `Necesitas $${this.leadPrice} para comprar este lead.`,
      confirmButtonText: 'Comprar créditos',
      confirmButtonColor: '#0d6efd',
      showCancelButton: true,
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        // this.router.navigate(['/professional/credits']);
        console.log('Navegar a compra de créditos');
      }
    });
    return;
  }

  if (this.getSpotsLeft(request) <= 0) {
    await Swal.fire({
      icon: 'info',
      title: 'Sin cupos disponibles',
      text: 'Esta solicitud ya tiene 3 profesionales asignados.',
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#0d6efd'
    });
    return;
  }

  // Confirmación de compra
  const result = await Swal.fire({
    title: '¿Comprar este lead?',
    html: `
      <div class="text-start">
        <p><strong>Precio:</strong> $${this.leadPrice}</p>
        <p><strong>Tu saldo actual:</strong> $${this.professionalCreditBalance}</p>
        <p><strong>Saldo después:</strong> $${(this.professionalCreditBalance - this.leadPrice).toFixed(2)}</p>
        <p class="text-muted small mb-0">Al confirmar, se desbloquearán los datos de contacto del cliente.</p>
      </div>
    `,
    icon: 'question',
    showCancelButton: true,
    confirmButtonText: 'Sí, comprar lead',
    confirmButtonColor: '#198754',
    cancelButtonText: 'Cancelar',
    cancelButtonColor: '#6c757d',
    reverseButtons: true
  });

  if (!result.isConfirmed) return;

  try {
    const profile = await this.pbService.pb.collection('professional_profiles').getFirstListItem(
      `userId="${this.currentUser.id}"`
    );

    const professionalProfileId = profile.id;

    if (profile['credit_balance'] < this.leadPrice) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Tu saldo ha cambiado. Verifica tus créditos e intenta nuevamente.',
        confirmButtonColor: '#0d6efd'
      });
      return;
    }

    // Mostrar loading mientras procesa
    Swal.fire({
      title: 'Procesando...',
      text: 'Comprando lead',
      allowOutsideClick: false,
      didOpen: () => Swal.showLoading()
    });

    // Descontar créditos
    await this.pbService.pb.collection('professional_profiles').update(professionalProfileId, {
      credit_balance: profile['credit_balance'] - this.leadPrice
    });

    // Actualizar request
    const updatedInterested = [...(request.interested_professionals || []), professionalProfileId];
    const newStatus = updatedInterested.length >= 3 ? 'full' : 'reviewing';

    await this.pbService.pb.collection('requests').update(request.id, {
      interested_professionals: updatedInterested,
      status: newStatus
    });

    // Actualizar variables locales
    this.professionalCreditBalance -= this.leadPrice;
    request.interested_professionals = updatedInterested;
    request.status = newStatus;

    // Éxito - mostrar datos desbloqueados
    await Swal.fire({
      icon: 'success',
      title: '¡Lead comprado!',
      html: `
        <div class="text-start">
          <p class="mb-2">Los datos de contacto han sido desbloqueados:</p>
          <div class="alert alert-light border mb-0">
            <strong>Cliente:</strong> ${request.client_name || 'Disponible en detalles'}<br>
            <strong>Teléfono:</strong> ${request.client_phone || 'Ver en detalles'}<br>
            <strong>Email:</strong> ${request.client_email || 'Ver en detalles'}
          </div>
        </div>
      `,
      confirmButtonText: 'Ver detalles completos',
      confirmButtonColor: '#0d6efd',
      showCancelButton: true,
      cancelButtonText: 'Cerrar'
    }).then((res) => {
      if (res.isConfirmed) {
        // this.router.navigate(['/professional/request', request.id]);
        console.log('Navegar a detalles');
      }
    });

  } catch (error) {
    console.error('Error purchasing lead:', error);
    Swal.fire({
      icon: 'error',
      title: 'Error',
      text: 'No se pudo completar la compra. Por favor, intenta nuevamente.',
      confirmButtonColor: '#0d6efd'
    });
  }
}

  // Método para cargar el saldo inicial (al iniciar)
  private async loadProfessionalCreditBalance(): Promise<void> {
    try {
      const profile = await this.pbService.pb.collection('professional_profiles').getFirstListItem(
        `userId="${this.currentUser.id}"`
      );
      this.professionalCreditBalance = profile['credit_balance'] || 0;
    } catch (error) {
      console.error('Error loading credit balance:', error);
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
  private async processPayment(professionalId: string, requestId: string): Promise<boolean> {
    try {
      const LEAD_PRICE = 4.99;

      // 1. Obtener perfil con credit_balance
      const profile = await this.pbService.pb.collection('professional_profiles').getOne(professionalId);
      const currentCredits = profile['credit_balance'] || 0;  // ← CAMBIAR AQUÍ

      if (currentCredits < LEAD_PRICE) {
        this.showInsufficientCreditsModal();
        return false;
      }
      // 2. Descontar créditos
      await this.pbService.pb.collection('professional_profiles').update(professionalId, {
        credit_balance: currentCredits - LEAD_PRICE  // ← CAMBIAR AQUÍ
      });

      // 2. Obtener la request y verificar disponibilidad
      const request = await this.pbService.pb.collection('requests').getOne(requestId);

      if (request['sold_leads'] >= 3) {
        this.showNotification('Error', 'Esta solicitud ya tiene 3 profesionales asignados', 'error');
        return false;
      }

      if (request['interested_professionals']?.includes(professionalId)) {
        this.showNotification('Info', 'Ya has comprado este lead', 'info');
        return false;
      }

      // 3. Iniciar transacción (PocketBase no tiene transacciones nativas, así que secuencial)

      // 3a. Descontar créditos del profesional
      await this.pbService.pb.collection('professional_profiles').update(professionalId, {
        credits: currentCredits - LEAD_PRICE
      });

      // 3b. Registrar la compra en lead_sales (opcional pero recomendado)
      await this.pbService.pb.collection('lead_sales').create({
        request_id: requestId,
        professional_id: professionalId,
        client_id: request['client_id'],
        price: LEAD_PRICE,
        purchased_at: new Date().toISOString(),
        contact_unlocked: true
      });

      // 3c. Actualizar la request
      const updatedInterested = [...(request['interested_professionals'] || []), professionalId];
      const newSoldLeads = updatedInterested.length;

      let newStatus = request['status'];
      if (newSoldLeads === 1) {
        newStatus = 'reviewing';
      } else if (newSoldLeads >= 3) {
        newStatus = 'full';
      }

      await this.pbService.pb.collection('requests').update(requestId, {
        interested_professionals: updatedInterested,
        sold_leads: newSoldLeads,
        status: newStatus
      });

      // 4. Desbloquear datos del cliente para este profesional
      await this.unlockClientData(requestId, professionalId);

      this.showNotification('Éxito', 'Lead comprado exitosamente. Datos del cliente desbloqueados.', 'success');
      return true;

    } catch (error) {
      console.error('Error en processPayment:', error);
      this.showNotification('Error', 'No se pudo completar la compra', 'error');
      return false;
    }
  }
  // Método para desbloquear datos del cliente
  private async unlockClientData(requestId: string, professionalId: string): Promise<void> {
    try {
      // Obtener datos completos de la request con el cliente
      const request = await this.pbService.pb.collection('requests').getOne(requestId, {
        expand: 'client_id'
      });

      const clientData = request.expand?.['client_id'];

      // Crear registro de acceso desbloqueado
      await this.pbService.pb.collection('unlocked_contacts').create({
        request_id: requestId,
        professional_id: professionalId,
        client_name: clientData?.name || '',
        client_phone: clientData?.phone || '',
        client_email: clientData?.email || '',
        unlocked_at: new Date().toISOString()
      });

      console.log('Datos desbloqueados para profesional:', professionalId);
    } catch (error) {
      console.error('Error desbloqueando datos:', error);
    }
  }

  // Método para comprar créditos (recarga)
  async purchaseCredits(amount: number): Promise<void> {
    const professionalId = this.currentUser.id;
    const profile = await this.pbService.pb.collection('professional_profiles').getOne(professionalId);

    const LEAD_PRICE = 4.99;
    const creditsToAdd = Math.floor(amount / LEAD_PRICE);

    // Actualizar saldo
    await this.pbService.pb.collection('professional_profiles').update(professionalId, {
      credit_balance: (profile['credit_balance'] || 0) + creditsToAdd
    });

    // Aquí integrar Stripe/PayPal para cobrar el dinero real
    // await this.stripeService.chargeCard(amount);
  }

  // Verificar saldo
  async checkCredits(): Promise<number> {
    try {
      const profile = await this.pbService.pb.collection('professional_profiles').getOne(this.currentUser.id);
      return profile['credit_balance'] || 0;
    } catch (error) {
      console.error('Error verificando créditos:', error);
      return 0;
    }
  }

private async showInsufficientCreditsModal(): Promise<void> {
  const result = await Swal.fire({
    icon: 'warning',
    title: 'Créditos insuficientes',
    html: `
      <div class="text-start">
        <p>No tienes suficientes créditos para comprar este lead.</p>
        <p class="mb-0"><strong>Precio del lead:</strong> $${this.leadPrice}</p>
      </div>
    `,
    confirmButtonText: 'Comprar créditos',
    confirmButtonColor: '#0d6efd',
    showCancelButton: true,
    cancelButtonText: 'Cancelar'
  });

  if (result.isConfirmed) {
    // this.router.navigate(['/professional/credits']);
    console.log('Navegar a compra de créditos');
  }
}
  // Notificaciones simples
// Método para mostrar notificaciones toast con SweetAlert2
private showNotification(title: string, message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
  const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true,
    didOpen: (toast) => {
      toast.addEventListener('mouseenter', Swal.stopTimer);
      toast.addEventListener('mouseleave', Swal.resumeTimer);
    },
    customClass: {
      popup: 'swal2-toast-custom'
    }
  });

  Toast.fire({
    icon: type,
    title: `<strong>${title}</strong>`,
    html: `<small>${message}</small>`
  });
}
  // Verificar si una request fue actualizada recientemente
  isRequestUpdated(requestId: string): boolean {
    return this.updatedRequestIds.has(requestId);
  }

  // Marcar una request como actualizada (para highlight visual)
  private markRequestAsUpdated(requestId: string): void {
    this.updatedRequestIds.add(requestId);

    // Remover la marca después de 2 segundos
    setTimeout(() => {
      this.updatedRequestIds.delete(requestId);
    }, 2000);
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

      const filterQuery = `(${zipFilters}) && client_id != "${this.currentUser.id}" && status != "contacted"`;
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
  // Método CORREGIDO para actualizar créditos
  private async updateProfessionalCredits(amount: number): Promise<void> {
    try {
      // 1. Obtener el professional_profile usando el userId
      const profile = await this.pbService.pb.collection('professional_profiles').getFirstListItem(
        `userId="${this.currentUser.id}"`
      );

      // 2. Actualizar usando el ID del professional_profile (NO del usuario)
      await this.pbService.pb.collection('professional_profiles').update(profile.id, {
        credit_balance: (profile['credit_balance'] || 0) + amount
      });

      // 3. Actualizar variable local
      this.professionalCreditBalance = (profile['credit_balance'] || 0) + amount;

    } catch (error) {
      console.error('Error updating credits:', error);
    }
  }
  // private async subscribeToProfessionalRequests(): Promise<void> {
  //   try {
  //     const profile = await this.pbService.pb.collection('professional_profiles').getFirstListItem(
  //       `userId="${this.currentUser.id}"`,
  //       { expand: 'service_zips' }
  //     );

  //     const serviceZipIds = profile.expand?.['service_zips'] || [];
  //     if (serviceZipIds.length === 0) return;

  //     const professionalZipCodes = new Set(
  //       serviceZipIds.map((zip: any) => zip.code || zip.zip_code || zip.name)
  //     );

  //     // Suscribirse a TODOS los cambios en requests
  //     this.unsubscribe = await this.pbService.pb.collection('requests').subscribe('*', (e) => {
  //       const requestZipCode = e.record['zip_code'];
  //       const isMatchingZip = professionalZipCodes.has(requestZipCode);
  //       const isNotOwnRequest = e.record['client_id'] !== this.currentUser.id;

  //       if (isMatchingZip && isNotOwnRequest) {
  //         const existingIndex = this.userRequests.findIndex(r => r.id === e.record.id);

  //         if (e.action === 'update') {
  //           // Verificar si cambió el campo interested_professionals
  //           const oldInterested = this.userRequests[existingIndex]?.interested_professionals || [];
  //           const newInterested = e.record['interested_professionals'] || [];

  //           // Si hay cambios en los profesionales interesados
  //           if (JSON.stringify(oldInterested) !== JSON.stringify(newInterested)) {
  //             console.log('🔄 Lead actualizado por otro profesional:', e.record.id);
  //             console.log('Nuevos interesados:', newInterested);

  //             if (existingIndex !== -1) {
  //               // Actualizar la request existente
  //               this.userRequests[existingIndex] = {
  //                 ...this.userRequests[existingIndex],
  //                 interested_professionals: newInterested,
  //                 status: e.record['status']
  //               };

  //               // Forzar detección de cambios en Angular
  //               this.userRequests = [...this.userRequests];
  //             }

  //             // Si se llenó (3 profesionales), remover de la lista
  //             if (newInterested.length >= 3) {
  //               setTimeout(() => {
  //                 this.userRequests = this.userRequests.filter(r => r.id !== e.record.id);
  //                 this.showNotification(
  //                   'Solicitud completada',
  //                   'Esta solicitud ya tiene 3 profesionales asignados',
  //                   'info'
  //                 );
  //               }, 2000);
  //             } else {
  //               // Mostrar notificación de que otro profesional compró
  //               const spotsLeft = 3 - newInterested.length;
  //               this.showNotification(
  //                 'Cupo ocupado',
  //                 `Quedan ${spotsLeft} cupo(s) disponible(s)`,
  //                 'error'
  //               );
  //             }
  //           }
  //         }
  //         else if (e.action === 'create' && e.record['status'] === 'sent') {
  //           // Nueva request creada
  //           if (existingIndex === -1) {
  //             this.newRequestIds.add(e.record.id);
  //             this.userRequests.unshift(e.record);
  //             setTimeout(() => this.newRequestIds.delete(e.record.id), 30000);
  //           }
  //         }
  //         else if (e.action === 'delete') {
  //           if (existingIndex !== -1) {
  //             this.userRequests.splice(existingIndex, 1);
  //             this.userRequests = [...this.userRequests];
  //           }
  //         }
  //       }
  //     });

  //     console.log('✅ Profesional suscrito a actualizaciones en tiempo real');
  //   } catch (error) {
  //     console.error('Error subscribing to professional requests:', error);
  //   }
  // }
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

      this.unsubscribe = await this.pbService.pb.collection('requests').subscribe('*', (e) => {
        const requestZipCode = e.record['zip_code'];
        const isMatchingZip = professionalZipCodes.has(requestZipCode);
        const isNotOwnRequest = e.record['client_id'] !== this.currentUser.id;

        if (isMatchingZip && isNotOwnRequest) {
          const existingIndex = this.userRequests.findIndex(r => r.id === e.record.id);

          if (e.action === 'update') {
            const oldInterested = this.userRequests[existingIndex]?.interested_professionals || [];
            const newInterested = e.record['interested_professionals'] || [];

            // Si cambió el campo interested_professionals
            if (JSON.stringify(oldInterested) !== JSON.stringify(newInterested)) {
              console.log('🔄 Lead actualizado por otro profesional:', e.record.id);

              if (existingIndex !== -1) {
                // Actualizar la request existente
                this.userRequests[existingIndex] = {
                  ...this.userRequests[existingIndex],
                  interested_professionals: newInterested,
                  status: e.record['status']
                };

                // Forzar detección de cambios en Angular
                this.userRequests = [...this.userRequests];

                // ← MARCAR como actualizada para highlight visual
                this.markRequestAsUpdated(e.record.id);
              }

              // Si se llenó (3 profesionales), remover de la lista
              if (newInterested.length >= 3) {
                setTimeout(() => {
                  this.userRequests = this.userRequests.filter(r => r.id !== e.record.id);
                  this.showNotification(
                    'Solicitud completada',
                    'Esta solicitud ya tiene 3 profesionales asignados',
                    'info'
                  );
                }, 2000);
              } else {
                const spotsLeft = 3 - newInterested.length;
                this.showNotification(
                  'Cupo ocupado',
                  `Quedan ${spotsLeft} cupo(s) disponible(s)`,
                  'warning'
                );
              }
            }
          }
          else if (e.action === 'create' && e.record['status'] === 'sent') {
            if (existingIndex === -1) {
              this.newRequestIds.add(e.record.id);
              this.userRequests.unshift(e.record);
              setTimeout(() => this.newRequestIds.delete(e.record.id), 30000);
            }
          }
          else if (e.action === 'delete') {
            if (existingIndex !== -1) {
              this.userRequests.splice(existingIndex, 1);
              this.userRequests = [...this.userRequests];
            }
          }
        }
      });

      console.log('✅ Profesional suscrito a actualizaciones en tiempo real');
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
