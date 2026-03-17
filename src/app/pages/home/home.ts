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
  professionalProfileId: string = '';  // ← AGREGAR ESTA

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
  try {
    this.currentUser = this.pocketbaseService.getCurrentUser();

    if (!this.currentUser) return;

    if (this.currentUser['type'] === 'professional') {
      const profile = await this.pbService.pb.collection('professional_profiles').getFirstListItem(
        `userId="${this.currentUser.id}"`
      );

      this.professionalProfileId = profile.id;

      await this.loadProfessionalCreditBalance();
      await this.loadProfessionalRequests();
      await this.subscribeToProfessionalRequests();
    } else if (this.currentUser['type'] === 'client') {
      await this.loadClientRequests();
      await this.subscribeToClientRequests();
    }
  } catch (error) {
    console.error('Error inicializando HomeComponent:', error);
  }
}
  // Obtener URL de la foto desde request_photos
  // Método CORREGIDO para obtener URL de fotos
// getStatusStep(status: string): number {

//   const map: any = {
//     sent: 1,
//     reviewing: 2,
//     contacted: 3,
//     closed: 4
//   };

//   return map[status] || 1;
// }
canViewPhotos(request: any): boolean {
  const user = this.pocketbaseService.getInstance().authStore.model;

  console.log('USER:', user);
  console.log('REQUEST:', request);
  console.log('REQUEST CLIENT ID:', request?.client_id);
  console.log('USER ID:', user?.id);
  console.log('HAS PURCHASED:', this.hasPurchasedLead(request));
  console.log('PHOTOS:', request?.expand?.photos);

  if (!user) return false;

  if (request?.client_id === user.id) {
    return true;
  }

  return this.hasPurchasedLead(request);
}
getStatusStep(status: string): number {
  const map: Record<string, number> = {
    sent: 1,
    reviewing: 2,
    contacted: 3,
    closed: 4
  };

  return map[status?.toLowerCase()] || 1;
}
  getPhotoUrl(photo: any): string {
    if (!photo?.file) {
      return '../../assets/images/vertical-service/blocked_images.png';
    }

    // ✅ Usar this.pbService.pb (no getInstance)
    const pb = this.pbService.pb;

    // PocketBase URL format: /api/files/{collection}/{recordId}/{filename}
    return `${pb.baseUrl}/api/files/request_photos/${photo.id}/${photo.file}`;
  }
  // Formatear número de teléfono para WhatsApp
  formatPhoneNumber(phone: string): string {
    if (!phone) return '';

    // Remover caracteres no numéricos
    const digits = phone.replace(/\D/g, '');

    // Si ya tiene código de país, retornar tal cual
    if (digits.startsWith('1')) {
      return digits;
    }

    // Agregar código de país si falta (ajusta según tu región)
    return '1' + digits;
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
  // Verificar si ya compró este lead
  hasPurchasedLead(request: any): boolean {
    if (!request.interested_professionals) return false;

    // ✅ Comparar con el ID del professional_profile, NO del user
    return request.interested_professionals.includes(this.professionalProfileId);
  }
  // Método para mostrar detalles del lead en modal
  async showLeadDetailsModal(request: any): Promise<void> {
    try {
      // Si no tiene expand, hacer fetch completo
      if (!request.expand?.photos || !request.expand?.client_id) {
        const fullRequest = await this.pbService.pb.collection('requests').getOne(request.id, {
          expand: 'photos,client_id'
        });
        request = fullRequest;
      }

      const clientName = request['client_name'] || 'N/A';
      const clientPhone = request['client_phone'] || 'N/A';
      const photos = request.expand?.photos || [];

      // Construir HTML del carousel de fotos
      const photosHtml = photos.length > 0 ? `
      <div id="leadCarousel-${request.id}" class="carousel slide mb-3" data-bs-ride="carousel">
        <div class="carousel-indicators">
          ${photos.map((_: any, i: number) => `
            <button type="button" data-bs-target="#leadCarousel-${request.id}" data-bs-slide-to="${i}" 
                    class="${i === 0 ? 'active' : ''}" aria-label="Slide ${i + 1}"></button>
          `).join('')}
        </div>
        <div class="carousel-inner rounded">
          ${photos.map((photo: any, i: number) => `
            <div class="carousel-item ${i === 0 ? 'active' : ''}">
              <img src="${this.getPhotoUrl(photo)}" 
                   class="d-block w-100" 
                   alt="Project photo ${i + 1}"
                   style="height: 250px; object-fit: cover;">
            </div>
          `).join('')}
        </div>
        <button class="carousel-control-prev" type="button" data-bs-target="#leadCarousel-${request.id}" data-bs-slide="prev">
          <span class="carousel-control-prev-icon" aria-hidden="true"></span>
          <span class="visually-hidden">Previous</span>
        </button>
        <button class="carousel-control-next" type="button" data-bs-target="#leadCarousel-${request.id}" data-bs-slide="next">
          <span class="carousel-control-next-icon" aria-hidden="true"></span>
          <span class="visually-hidden">Next</span>
        </button>
      </div>
    ` : `
      <div class="text-center py-3 text-muted">
        <i data-feather="image" class="mb-2"></i>
        <p class="mb-0">No photos available</p>
      </div>
    `;

      // Mostrar modal con SweetAlert2
      await Swal.fire({
        title: `<strong>📋 Request #${request.id.slice(0, 6)}</strong>`,
        html: `
        <div class="text-start">
          <!-- Proyecto -->
          <div class="mb-3 pb-2 border-bottom">
            <h6 class="fw-bold mb-1">${request.wallpaper_type}</h6>
            <p class="small text-muted mb-0">
              ${request.space_type} • ${request.size_sqm} m² • ${request.height_m} m height
            </p>
          </div>

          <!-- Fotos (Carousel) -->
          ${photosHtml}

          <!-- Contacto del cliente -->
          <div class="alert alert-success mb-3">
            <div class="d-flex align-items-center gap-2 mb-2">
              <i data-feather="unlock" style="width: 16px;"></i>
              <strong>Client Contact</strong>
            </div>
          <div class="row g-2">
  <div class="col-12">
    <small class="text-muted">Name</small>
    <p class="fw-medium mb-0">${request.client_name || 'N/A'}</p>
  </div>
  <div class="col-12">
    <small class="text-muted">Phone</small>
    <p class="fw-medium mb-2">
      <a href="tel:${request.client_phone}" class="text-decoration-none">
        ${request.client_phone || 'N/A'}
      </a>
    </p>
    <a href="https://wa.me/${this.formatPhoneNumber(request.client_phone)}" 
       target="_blank"
       class="btn btn-success btn-sm w-100">
      <i class="me-1" data-feather="message-circle" style="width: 14px;"></i>
      Contact via WhatsApp
    </a>
  </div>
</div>
          </div>

          <!-- Ubicación y presupuesto -->
          <div class="row g-2 small">
            <div class="col-6">
              <span class="text-muted">Location:</span><br>
              <strong>${request.city}, ${request.zip_code}</strong>
            </div>
            <div class="col-6 text-end">
              <span class="text-muted">Budget:</span><br>
              <strong class="text-success">${request.budget_range}</strong>
            </div>
          </div>
        </div>
      `,
        width: '95%',
        showConfirmButton: true,
        confirmButtonText: 'Close',
        confirmButtonColor: '#0d6efd',
        didOpen: () => {
          // Inicializar Feather icons dentro del modal
          if (typeof window !== 'undefined' && (window as any).feather) {
            (window as any).feather.replace();
          }
        }
      });

    } catch (error) {
      console.error('Error showing lead details:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Could not load lead details. Please try again.',
        confirmButtonColor: '#0d6efd'
      });
    }
  }

  async purchaseLead(request: any): Promise<void> {
    // =================================================================
    // 1. VALIDACIÓN: Créditos suficientes
    // =================================================================
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

    // =================================================================
    // 2. VALIDACIÓN: Cupos disponibles (máximo 3 profesionales)
    // =================================================================
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

    // =================================================================
    // 3. CONFIRMACIÓN DE COMPRA (SweetAlert2)
    // =================================================================
    const result = await Swal.fire({
      title: '¿Comprar este lead?',
      html: `
      <div class="text-start">
        <p><strong>Precio:</strong> $${this.leadPrice}</p>
        <p><strong>Tu saldo actual:</strong> $${this.professionalCreditBalance}</p>
        <p><strong>Saldo después:</strong> $${(this.professionalCreditBalance - this.leadPrice).toFixed(2)}</p>
        <p class="text-muted small mb-0">Al confirmar, se desbloquearán: nombre, teléfono y fotos del cliente.</p>
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

    // =================================================================
    // 4. PROCESO DE COMPRA
    // =================================================================
    try {
      // 4.1 Obtener perfil del profesional (para obtener su ID en professional_profiles)
      const profile = await this.pbService.pb.collection('professional_profiles').getFirstListItem(
        `userId="${this.currentUser.id}"`
      );

      const professionalProfileId = profile.id;

      // 4.2 Verificar saldo nuevamente (por seguridad - posible race condition)
      if (profile['credit_balance'] < this.leadPrice) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Tu saldo ha cambiado. Verifica tus créditos e intenta nuevamente.',
          confirmButtonColor: '#0d6efd'
        });
        return;
      }

      // 4.3 Mostrar loading mientras procesa
      Swal.fire({
        title: 'Procesando...',
        text: 'Comprando lead',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
      });

      // 4.4 Descontar créditos del profesional
      await this.pbService.pb.collection('professional_profiles').update(professionalProfileId, {
        credit_balance: profile['credit_balance'] - this.leadPrice
      });

      // 4.5 Actualizar request: agregar profesional interesado y cambiar status
      const updatedInterested = [...(request.interested_professionals || []), professionalProfileId];
      const newStatus = updatedInterested.length >= 3 ? 'full' : 'reviewing';

      await this.pbService.pb.collection('requests').update(request.id, {
        interested_professionals: updatedInterested,
        status: newStatus
      });

      // =================================================================
      // 5. ⭐ CRÍTICO: Fetch COMPLETO con expand para obtener datos desbloqueados
      //    Según documento §5.5: al pagar se desbloquea nombre, teléfono y fotos
      // =================================================================
      const unlockedRequest = await this.pbService.pb.collection('requests').getOne(request.id, {
        expand: 'photos'  // ← Esto desbloquea los datos protegidos por API Rules
      });

      // Debug opcional (remover en producción)
      console.log('✅ Request desbloqueada:', {
        id: unlockedRequest.id,
        photos: unlockedRequest.expand?.['photos']?.length,
        client_name: unlockedRequest['client_name'],  // ← Directo desde request
        client_phone: unlockedRequest['client_phone']  // ← Directo desde request

      });

      // =================================================================
      // 6. Actualizar el array local (forzar cambio en Angular)
      // =================================================================
      const index = this.userRequests.findIndex(r => r.id === request.id);
      if (index !== -1) {
        // Reemplazar el request con la versión desbloqueada
        this.userRequests[index] = unlockedRequest;
        // Forzar detección de cambios en Angular (inmutabilidad)
        this.userRequests = [...this.userRequests];
      }

      // =================================================================
      // 7. Actualizar variable local de créditos
      // =================================================================
      this.professionalCreditBalance -= this.leadPrice;

      // =================================================================
      // 8. Mostrar toast de éxito (NO modal con navegación - no existe vista detalles)
      //    Según documento §8: NO se debe construir vista de detalles separada
      // =================================================================
      await Swal.fire({
        icon: 'success',
        title: '¡Lead desbloqueado!',
        text: 'Ahora puedes ver el contacto y las fotos del cliente en esta misma vista.',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 2500,
        timerProgressBar: true,
        didOpen: (toast) => {
          toast.addEventListener('mouseenter', Swal.stopTimer);
          toast.addEventListener('mouseleave', Swal.resumeTimer);
        }
      });

      // =================================================================
      // 9. Inicializar Bootstrap Carousel DESPUÉS de que Angular renderice
      // =================================================================
      setTimeout(() => {
        this.initCarousel(request.id);
      }, 200);

    } catch (error) {
      console.error('❌ Error purchasing lead:', error);

      // Cerrar loading si está abierto
      Swal.close();

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo completar la compra. Por favor, intenta nuevamente.',
        confirmButtonColor: '#0d6efd'
      });
    }
  }

  // =================================================================
  // MÉTODO HELPER: Inicializar Bootstrap Carousel
  // =================================================================
  private initCarousel(requestId: string): void {
    // Verificar que estamos en navegador y que Bootstrap está disponible
    if (typeof window !== 'undefined' && (window as any).bootstrap?.Carousel) {
      const carouselEl = document.querySelector(`#carousel-${requestId}`);

      if (carouselEl) {
        // Verificar si ya está inicializado para evitar duplicados
        if (!(carouselEl as any).bootstrap) {
          new (window as any).bootstrap.Carousel(carouselEl);
          console.log('🎠 Carousel inicializado para request:', requestId);
        }
      } else {
        console.warn('⚠️ No se encontró el carousel #carousel-' + requestId);
      }
    } else {
      console.warn('⚠️ Bootstrap Carousel no está disponible');
    }
  }
  private initAllCarousels(): void {
    if (typeof window !== 'undefined' && (window as any).bootstrap?.Carousel) {
      document.querySelectorAll('.carousel').forEach(carouselEl => {
        if (!(carouselEl as any).bootstrap) {
          new (window as any).bootstrap.Carousel(carouselEl);
        }
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
// private async loadClientRequests(): Promise<void> {
//   try {
//     const records = await this.pbService.pb.collection('requests').getList(1, 50, {
//       filter: `client_id="${this.currentUser.id}"`,
//       sort: '-created',
//       expand: 'photos'
//     });

//     this.userRequests = records.items;

//     setTimeout(() => {
//       this.initAllCarousels();
//     }, 100);

//     console.log('Solicitudes del cliente cargadas:', this.userRequests);
//   } catch (error) {
//     console.error('Error loading client requests:', error);
//   }
// }
async loadClientRequests() {
  try {
    const userId = this.currentUser?.id;
    if (!userId) {
      this.userRequests = [];
      return;
    }

    const requests = await this.pbService.pb
      .collection('requests')
      .getFullList({
        filter: `client_id="${userId}"`,
        sort: '-created',
        expand: 'photos,interested_professionals,interested_professionals.userId'
      });

    this.userRequests = requests.map((request: any) => ({
      ...request,
      expand: {
        photos: request.expand?.photos ?? [],
        interested_professionals: request.expand?.interested_professionals ?? []
      }
    }));

    console.log('✅ Requests del cliente:', this.userRequests);
  } catch (error) {
    console.error('❌ Error cargando requests del cliente:', error);
    this.userRequests = [];
  }
}
// private async subscribeToClientRequests(): Promise<void> {
//   this.unsubscribe = await this.pbService.pb.collection('requests').subscribe('*', async (e) => {
//     try {
//       const record = e.record;

//       if (record['client_id'] !== this.currentUser.id) return;

//       if (e.action === 'create') {
//         const fullRequest = await this.pbService.pb.collection('requests').getOne(record.id, {
//           expand: 'photos'
//         });

//         const exists = this.userRequests.some(r => r.id === fullRequest.id);
//         if (!exists) {
//           this.userRequests = [fullRequest, ...this.userRequests];
//         }

//         setTimeout(() => this.initCarousel(fullRequest.id), 150);
//       }

//       else if (e.action === 'update') {
//         const fullRequest = await this.pbService.pb.collection('requests').getOne(record.id, {
//           expand: 'photos'
//         });

//         const index = this.userRequests.findIndex(r => r.id === fullRequest.id);
//         if (index !== -1) {
//           this.userRequests[index] = fullRequest;
//           this.userRequests = [...this.userRequests];
//         } else {
//           this.userRequests = [fullRequest, ...this.userRequests];
//         }

//         setTimeout(() => this.initCarousel(fullRequest.id), 150);
//       }

//       else if (e.action === 'delete') {
//         this.userRequests = this.userRequests.filter(r => r.id !== record.id);
//       }
//     } catch (error) {
//       console.error('Error en realtime cliente:', error);
//     }
//   }, {
//     filter: `client_id="${this.currentUser.id}"`
//   });
// }
getProfessionalImage(professional: any): string {
  const user = professional?.expand?.userId;

  if (user?.avatar) {
    return this.pbService.fileUrl(user, user.avatar);
  }

  return '../../assets/images/profile/p4.png';
}

getProfessionalExperience(professional: any): string {
  if (professional?.experience_years) {
    return `${professional.experience_years} years of experience`;
  }

  if (professional?.experience) {
    return professional.experience;
  }

  if (professional?.specialty) {
    return professional.specialty;
  }

  return 'Professional available';
}
async subscribeToClientRequests() {
  try {
    const userId = this.currentUser?.id;
    if (!userId) return;

    await this.pbService.pb.collection('requests').subscribe('*', async (e) => {
      const record = e.record as any;

      if (record?.client_id !== userId) return;

      if (e.action === 'delete') {
        this.userRequests = this.userRequests.filter((r: any) => r.id !== record.id);
        return;
      }

      if (e.action === 'create' || e.action === 'update') {
        const freshRequest = await this.pbService.pb
          .collection('requests')
          .getOne(record.id, {
            expand: 'photos,interested_professionals,interested_professionals.userId'
          });

        const normalized = {
          ...freshRequest,
          expand: {
            photos: freshRequest.expand?.['photos'] ?? [],
            interested_professionals: freshRequest.expand?.['interested_professionals'] ?? []
          }
        };

        const index = this.userRequests.findIndex((r: any) => r.id === record.id);

        if (index >= 0) {
          this.userRequests[index] = normalized;
          this.userRequests = [...this.userRequests];
        } else {
          this.userRequests = [normalized, ...this.userRequests];
        }
      }
    });
  } catch (error) {
    console.error('❌ Error en suscripción cliente:', error);
  }
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
getProfessionalName(professional: any): string {
  const user = professional?.expand?.userId;

  return (
    user?.name ||
    professional?.name ||
    professional?.full_name ||
    'Professional'
  );
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
  // private async loadProfessionalRequests(): Promise<void> {
  //   this.loading = true;
  //   try {
  //     // 1. Obtener el perfil del profesional EXPANDIENDO service_zips
  //     const profile = await this.pbService.pb.collection('professional_profiles').getFirstListItem(
  //       `userId="${this.currentUser.id}"`,
  //       { expand: 'service_zips' }  // ¡IMPORTANTE: expandir la relación!
  //     );

  //     const serviceZipIds = profile.expand?.['service_zips'] || [];
  //     this.professionalZipsCount = serviceZipIds.length;

  //     if (serviceZipIds.length === 0) {
  //       this.userRequests = [];
  //       console.log('El profesional no tiene service_zips configurados');
  //       return;
  //     }

  //     // 2. Extraer los VALORES de zip_code (ej: "27515") desde los objetos expandidos
  //     // Asumiendo que la colección zipcodes tiene un campo llamado "code" o "zip_code"
  //     const professionalZipCodes = serviceZipIds.map((zip: any) => {
  //       // Ver qué campo tiene el valor del zip code en tu colección zipcodes
  //       return zip.code || zip.zip_code || zip.name;
  //     });

  //     console.log('Zip codes del profesional (VALORES):', professionalZipCodes);

  //     // 3. Construir filtro con los VALORES de texto
  //     const zipFilters = professionalZipCodes.map((code: string) => `zip_code="${code}"`).join('||');

  //     const filterQuery = `(${zipFilters}) && client_id != "${this.currentUser.id}" && status != "contacted"`;
  //     console.log('Filtro:', filterQuery);

  //     const records = await this.pbService.pb.collection('requests').getList(1, 50, {
  //       filter: filterQuery,
  //       sort: '-created'
  //     });

  //     this.userRequests = records.items;
  //     console.log('Requests encontradas:', this.userRequests);
  //     console.log('Total:', records.totalItems);

  //   } catch (error) {
  //     console.error('Error loading professional requests:', error);
  //   } finally {
  //     this.loading = false;
  //   }
  // }
private async loadProfessionalRequests(): Promise<void> {
  this.loading = true;

  try {
    const profile = await this.pbService.pb.collection('professional_profiles').getFirstListItem(
      `userId="${this.currentUser.id}"`,
      { expand: 'service_zips' }
    );

    const serviceZipRecords = profile.expand?.['service_zips'] || [];
    this.professionalZipsCount = serviceZipRecords.length;

    if (!serviceZipRecords.length) {
      this.userRequests = [];
      return;
    }

    const professionalZipCodes = serviceZipRecords
      .map((zip: any) => zip.code || zip.zip_code || zip.name)
      .filter(Boolean);

    const zipFilters = professionalZipCodes
      .map((code: string) => `zip_code="${code}"`)
      .join(' || ');

    const filterQuery = `(${zipFilters}) && status != "contacted"`;

    const records = await this.pbService.pb.collection('requests').getList(1, 50, {
      filter: filterQuery,
      sort: '-created',
      expand: 'photos'
    });

    this.userRequests = records.items;

    setTimeout(() => {
      this.initAllCarousels();
    }, 100);

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

private async subscribeToProfessionalRequests(): Promise<void> {
  try {
    const profile = await this.pbService.pb.collection('professional_profiles').getFirstListItem(
      `userId="${this.currentUser.id}"`,
      { expand: 'service_zips' }
    );

    const serviceZipRecords = profile.expand?.['service_zips'] || [];

    if (!serviceZipRecords.length) {
      console.warn('El profesional no tiene zonas configuradas');
      return;
    }

    const professionalZipCodes = new Set(
      serviceZipRecords.map((zip: any) => zip.code || zip.zip_code || zip.name).filter(Boolean)
    );

    this.unsubscribe = await this.pbService.pb.collection('requests').subscribe('*', async (e) => {
      try {
        const record = e.record;
        const requestZipCode = record['zip_code'];
        const isMatchingZip = professionalZipCodes.has(requestZipCode);
        const isNotOwnRequest = record['client_id'] !== this.currentUser.id;

        if (!isMatchingZip || !isNotOwnRequest) return;

        const existingIndex = this.userRequests.findIndex(r => r.id === record.id);

        // ===== CREATE =====
        if (e.action === 'create') {
          if (record['status'] !== 'sent') return;
          if (existingIndex !== -1) return;

          // Traer la request completa con expand
          const fullRequest = await this.pbService.pb.collection('requests').getOne(record.id, {
            expand: 'photos'
          });

          this.newRequestIds.add(fullRequest.id);
          this.userRequests = [fullRequest, ...this.userRequests];

          setTimeout(() => {
            this.newRequestIds.delete(fullRequest.id);
          }, 30000);

          this.showNotification(
            'Nueva solicitud',
            'Se ha publicado una nueva solicitud en una de tus zonas.',
            'success'
          );

          setTimeout(() => this.initCarousel(fullRequest.id), 150);
        }

        // ===== UPDATE =====
        else if (e.action === 'update') {
          // Traer versión completa actualizada
          const fullRequest = await this.pbService.pb.collection('requests').getOne(record.id, {
            expand: 'photos'
          });

          // Si ya no cumple condiciones, eliminarla
          const stillValid =
            professionalZipCodes.has(fullRequest['zip_code']) &&
            fullRequest['client_id'] !== this.currentUser.id &&
            fullRequest['status'] !== 'contacted';

          if (!stillValid) {
            if (existingIndex !== -1) {
              this.userRequests = this.userRequests.filter(r => r.id !== fullRequest.id);
            }
            return;
          }

          if (existingIndex !== -1) {
            this.userRequests[existingIndex] = fullRequest;
            this.userRequests = [...this.userRequests];
            this.markRequestAsUpdated(fullRequest.id);
          } else {
            this.userRequests = [fullRequest, ...this.userRequests];
          }

          const sold = fullRequest['interested_professionals']?.length || 0;

          if (sold >= 3) {
            this.showNotification(
              'Solicitud completada',
              'Esta solicitud ya alcanzó el máximo de 3 profesionales.',
              'info'
            );
          } else {
            const spotsLeft = 3 - sold;
            this.showNotification(
              'Solicitud actualizada',
              `Quedan ${spotsLeft} cupo(s) disponibles.`,
              'warning'
            );
          }

          setTimeout(() => this.initCarousel(fullRequest.id), 150);
        }

        // ===== DELETE =====
        else if (e.action === 'delete') {
          if (existingIndex !== -1) {
            this.userRequests = this.userRequests.filter(r => r.id !== record.id);
          }
        }
      } catch (innerError) {
        console.error('Error procesando evento realtime:', innerError);
      }
    });

    console.log('✅ Suscripción realtime para profesionales activa');
  } catch (error) {
    console.error('Error subscribing to professional requests:', error);
  }
}

  ngOnDestroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }




  // private async loadUserRequests(): Promise<void> {
  //   try {
  //     // Cargar solicitudes iniciales del usuario usando el índice client_id
  //     const records = await this.pbService.pb.collection('requests').getList(1, 50, {
  //       filter: `client_id="${this.pocketbaseService.getCurrentUser()?.id}"`,
  //       sort: '-created'
  //     });
  //     this.userRequests = records.items;
  //     console.log('Solicitudes cargadas:', this.userRequests);
  //   } catch (error) {
  //     console.error('Error loading user requests:', error);
  //   }
  // }
async loadUserRequests() {
  try {
    const userId = this.currentUser?.id;
    if (!userId) {
      this.userRequests = [];
      return;
    }

    const requests = await this.pbService.pb
      .collection('requests')
      .getFullList({
        filter: `client_id="${userId}"`,
        sort: '-created',
        expand: 'photos,interested_professionals'
      });

    this.userRequests = requests.map((request: any) => ({
      ...request,
      expand: {
        ...request.expand,
        photos: request.expand?.photos || [],
        interested_professionals: request.expand?.interested_professionals || []
      }
    }));
  } catch (error) {
    console.error('❌ Error cargando requests:', error);
    this.userRequests = [];
  }
}

  // private async subscribeToUserRequests(): Promise<void> {
  //   // Suscribirse a cambios en tiempo real para las solicitudes del usuario
  //   this.unsubscribe = await this.pbService.pb.collection('requests').subscribe('*', (e) => {
  //     console.log('Cambio en solicitudes:', e.action, e.record);

  //     if (e.record['client_id'] === this.pocketbaseService.getCurrentUser()?.id) {
  //       if (e.action === 'create') {
  //         this.userRequests.unshift(e.record);
  //       } else if (e.action === 'update') {
  //         const index = this.userRequests.findIndex(r => r.id === e.record.id);
  //         if (index !== -1) {
  //           this.userRequests[index] = e.record;
  //         }
  //       } else if (e.action === 'delete') {
  //         this.userRequests = this.userRequests.filter(r => r.id !== e.record.id);
  //       }
  //     }
  //   }, {
  //     filter: `client_id="${this.pocketbaseService.getCurrentUser()?.id}"`
  //   });
  // }
}
