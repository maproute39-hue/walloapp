import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PocketbaseService } from '@app/services/pocketbase.service';
import { PbService } from '@app/services/pb.service';
import { environment } from '@app/environments/environment';

interface ReviewItem {
  id: string;
  rating: number;
  comment: string;
  is_public?: boolean;
  status?: string;
  created: string;
  updated?: string;
  client?: string;
  professional_profile?: string;
  request?: string;
  expand?: {
    client?: any;
    request?: any;
    professional_profile?: any;
  };
}

@Component({
  selector: 'app-professional-reviews',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './professional-reviews.html',
  styleUrl: './professional-reviews.scss'
})
export class ProfessionalReviews implements OnInit {
  route = inject(ActivatedRoute);

  reviews: ReviewItem[] = [];
  filteredReviews: ReviewItem[] = [];

  loading = false;
  errorMessage = '';

  sortValue: 'lowest' | 'highest' | 'latest' = 'latest';

  professionalProfileId = '';
  averageRating = 0;
  totalReviews = 0;

  ratingStats: Record<number, { count: number; percent: number }> = {
    5: { count: 0, percent: 0 },
    4: { count: 0, percent: 0 },
    3: { count: 0, percent: 0 },
    2: { count: 0, percent: 0 },
    1: { count: 0, percent: 0 }
  };

  constructor(
    public router: Router,
    private pbService: PbService,
    private pocketbaseService: PocketbaseService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadReviews();
  }

  async loadReviews(): Promise<void> {
    try {
      this.loading = true;
      this.errorMessage = '';

      const routeProfessionalProfileId =
        this.route.snapshot.paramMap.get('professionalProfileId') ||
        this.route.snapshot.queryParamMap.get('professionalProfileId');

      if (routeProfessionalProfileId) {
        this.professionalProfileId = routeProfessionalProfileId;
      } else {
        const currentUser = this.pocketbaseService.getCurrentUser();

        if (!currentUser) {
          this.errorMessage = 'No se pudo identificar el usuario actual.';
          return;
        }

        if (currentUser['type'] !== 'professional') {
          this.errorMessage = 'Este usuario no es un profesional.';
          return;
        }

        const profile = await this.pbService.pb
          .collection('professional_profiles')
          .getFirstListItem(`userId="${currentUser.id}"`);

        this.professionalProfileId = profile.id;
      }

      const list = await this.pbService.pb.collection('reviews').getFullList<ReviewItem>({
        filter: `professional_profile="${this.professionalProfileId}" && is_public=true && status="published"`,
        sort: '-created',
        expand: 'client,request,professional_profile'
      });

      this.reviews = list || [];
      this.computeStats();
      this.applySort();
    } catch (error: any) {
      console.error('Error cargando reviews:', error);

      // fallback por si no usas status="published"
      try {
        const fallbackList = await this.pbService.pb.collection('reviews').getFullList<ReviewItem>({
          filter: `professional_profile="${this.professionalProfileId}" && is_public=true`,
          sort: '-created',
          expand: 'client,request,professional_profile'
        });

        this.reviews = fallbackList || [];
        this.computeStats();
        this.applySort();
      } catch (fallbackError) {
        console.error('Error en fallback reviews:', fallbackError);
        this.errorMessage = 'No fue posible cargar las reseñas.';
      }
    } finally {
      this.loading = false;
    }
  }

  computeStats(): void {
    this.totalReviews = this.reviews.length;

    if (!this.totalReviews) {
      this.averageRating = 0;
      this.ratingStats = {
        5: { count: 0, percent: 0 },
        4: { count: 0, percent: 0 },
        3: { count: 0, percent: 0 },
        2: { count: 0, percent: 0 },
        1: { count: 0, percent: 0 }
      };
      return;
    }

    const total = this.reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
    this.averageRating = Number((total / this.totalReviews).toFixed(1));

    for (let star = 1; star <= 5; star++) {
      const count = this.reviews.filter(r => Number(r.rating) === star).length;
      const percent = Math.round((count / this.totalReviews) * 100);
      this.ratingStats[star] = { count, percent };
    }
  }

  applySort(): void {
    const arr = [...this.reviews];

    switch (this.sortValue) {
      case 'lowest':
        arr.sort((a, b) => Number(a.rating) - Number(b.rating));
        break;
      case 'highest':
        arr.sort((a, b) => Number(b.rating) - Number(a.rating));
        break;
      case 'latest':
      default:
        arr.sort(
          (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
        );
        break;
    }

    this.filteredReviews = arr;
  }

  onSortChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as 'lowest' | 'highest' | 'latest';
    this.sortValue = value;
    this.applySort();
  }

  getStarsArray(rating: number): boolean[] {
    const rounded = Math.round(Number(rating || 0));
    return Array.from({ length: 5 }, (_, i) => i < rounded);
  }

  getClientName(review: ReviewItem): string {
    const client = review.expand?.client;
    if (!client) return 'Usuario';
    return client.name || client.username || client.email || 'Usuario';
  }

  getClientAvatar(review: ReviewItem): string {
    const client = review.expand?.client;
    if (client?.avatar) {
      return `${environment.pbUrl}/api/files/${client.collectionId}/${client.id}/${client.avatar}`;
    }
    return 'assets/images/profile/default-user.png';
  }
getStars(rating: number): boolean[] {
  const value = Math.round(Number(rating || 0));
  return Array.from({ length: 5 }, (_, i) => i < value);
}
  getRequestServiceName(review: ReviewItem): string {
    const request = review.expand?.request;
    if (!request) return 'Servicio';

    return (
      request.serviceName ||
      request.service ||
      request.categoryName ||
      request.title ||
      request.name ||
      request.description ||
      'Servicio'
    );
  }

  trackByReview(index: number, item: ReviewItem): string {
    return item.id;
  }
}