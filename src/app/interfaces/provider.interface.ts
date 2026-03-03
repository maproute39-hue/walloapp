export interface Provider {
    id: string;
    name: string;
    rating?: number;        // 0..5
    avatarUrl?: string;
    specialties?: string[];
    slug?: string;
  }
  