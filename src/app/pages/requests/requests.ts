import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

interface Request {
  id: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  address: string;
  price: number;
  serviceType: string;
  professional?: {
    name: string;
    avatar?: string;
    rating?: number;
  };
  createdAt: Date;
  scheduledDate?: Date;
  completedDate?: Date;
}

interface Filter {
  label: string;
  value: string;
}

@Component({
  selector: 'app-requests',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './requests.html',
  styleUrl: './requests.scss'
})
export class Requests implements OnInit {
  requests: Request[] = [];
  filteredRequests: Request[] = [];
  loading = true;
  searchTerm = '';
  currentFilter = 'all';
  sortValue = 'newest';

  filters: Filter[] = [
    { label: 'Todas', value: 'all' },
    { label: 'Pendings', value: 'pending' },
    { label: 'In progress', value: 'in-progress' },
    { label: 'Completeds', value: 'completed' },
    { label: 'Cancelleds', value: 'cancelled' }
  ];

  private mockRequests: Request[] = [
    {
      id: '#REQ-2023-001',
      status: 'in-progress',
      address: '123 Main Street, New York',
      price: 537.00,
      serviceType: 'Instalación de Wallpaper',
      professional: { name: 'Carlos Rodríguez', avatar: '/assets/images/profile/p11.png', rating: 4.9 },
      createdAt: new Date('2023-10-21'),
      scheduledDate: new Date('2023-10-25T10:00:00')
    },
    {
      id: '#REQ-2023-002',
      status: 'completed',
      address: '456 Oak Avenue, Brooklyn',
      price: 425.00,
      serviceType: 'Instalación de Wallpaper',
      professional: { name: 'María González', avatar: '/assets/images/profile/p10.png', rating: 4.7 },
      createdAt: new Date('2023-10-15'),
      completedDate: new Date('2023-10-18')
    },
    {
      id: '#REQ-2023-003',
      status: 'pending',
      address: '789 Pine Road, Queens',
      price: 680.00,
      serviceType: 'Instalación de Wallpaper',
      createdAt: new Date('2023-10-22')
    },
    {
      id: '#REQ-2023-004',
      status: 'completed',
      address: '321 Elm Street, Manhattan',
      price: 350.00,
      serviceType: 'Instalación de Wallpaper',
      professional: { name: 'Juan Pérez', avatar: '/assets/images/profile/p9.png', rating: 4.5 },
      createdAt: new Date('2023-09-28'),
      completedDate: new Date('2023-10-01')
    },
    {
      id: '#REQ-2023-005',
      status: 'cancelled',
      address: '555 Maple Drive, Bronx',
      price: 0.00,
      serviceType: 'Instalación de Wallpaper',
      createdAt: new Date('2023-09-15'),
      completedDate: new Date('2023-09-16')
    }
  ];

  ngOnInit(): void {
    this.loadRequests();
  }

  loadRequests(): void {
    this.loading = true;
    setTimeout(() => {
      this.requests = this.mockRequests;
      this.filterRequests();
      this.loading = false;
    }, 500);
  }

  setFilter(filterValue: string): void {
    this.currentFilter = filterValue;
    this.filterRequests();
  }

  filterRequests(): void {
    let filtered = [...this.requests];

    if (this.currentFilter !== 'all') {
      filtered = filtered.filter(req => req.status === this.currentFilter);
    }

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(req => 
        req.id.toLowerCase().includes(term) ||
        req.address.toLowerCase().includes(term) ||
        req.professional?.name.toLowerCase().includes(term) ||
        req.serviceType.toLowerCase().includes(term)
      );
    }

    filtered.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();

      switch(this.sortValue) {
        case 'newest':
          return dateB - dateA;
        case 'oldest':
          return dateA - dateB;
        case 'price-high':
          return b.price - a.price;
        case 'price-low':
          return a.price - b.price;
        default:
          return 0;
      }
    });

    this.filteredRequests = filtered;
  }

  getStatusBadgeClass(status: string): string {
    const classes: { [key: string]: string } = {
      'pending': 'badge-info',
      'in-progress': 'badge-warning',
      'completed': 'badge-success',
      'cancelled': 'badge-secondary'
    };
    return classes[status] || 'badge-secondary';
  }

  getStatusIcon(status: string): string {
    const icons: { [key: string]: string } = {
      'pending': 'bi-clock',
      'in-progress': 'bi-tools',
      'completed': 'bi-check-circle',
      'cancelled': 'bi-x-circle'
    };
    return icons[status] || 'bi-circle';
  }

  getStatusLabel(status: string): string {
    const labels: { [key: string]: string } = {
      'pending': 'Pending',
      'in-progress': 'In progress',
      'completed': 'Completed',
      'cancelled': 'Cancelled'
    };
    return labels[status] || status;
  }

  getStatusDateText(request: Request): string {
    if (request.status === 'completed' && request.completedDate) {
      return `Completado: ${this.formatDate(request.completedDate)}`;
    }
    if (request.status === 'cancelled') {
      return 'Cancelled';
    }
    if (request.scheduledDate) {
      return this.formatDate(request.scheduledDate);
    }
    return 'Looking for Professionals...';
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  openNewRequest(): void {
    console.log('Create request');
  }

  cancelRequest(request: Request): void {
    if (confirm(`Are you sure you want to cancel the request
 ${request.id}?`)) {
      this.loadRequests();
    }
  }

  openRatingModal(request: Request): void {
    console.log('Rate:', request.id);
  }
}