import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-professional-reviews',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './professional-reviews.html',
  styleUrl: './professional-reviews.scss'
})
export class ProfessionalReviews {
    route = inject(ActivatedRoute);

  constructor(public router: Router) {}
}
