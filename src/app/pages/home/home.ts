import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PbService } from '../../services/pb.service';
import { PocketbaseService } from '@app/services/pocketbase.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.scss'
})
export class HomeComponent implements OnInit, OnDestroy {
  userId: string = ''; // Usuario simulado para pruebas
  userRequests: any[] = [];
  private unsubscribe: (() => void) | null = null;

  constructor(
    private pocketbaseService: PocketbaseService,
    private pbService: PbService) {}

  async ngOnInit(): Promise<void> {
    await this.loadUserRequests();
    await this.subscribeToUserRequests();
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
