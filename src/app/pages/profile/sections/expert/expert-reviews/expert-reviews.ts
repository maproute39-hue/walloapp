import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthPocketbaseService } from '../../../../../services/auth-pocketbase.service';
import Swal from 'sweetalert2';
@Component({
  selector: 'app-expert-reviews',
  standalone:true,
  imports: [CommonModule, ReactiveFormsModule
,RouterLink
  ],
  templateUrl: './expert-reviews.html',
  styleUrl: './expert-reviews.scss'
})
export class ExpertReviews {
 router = inject(Router);

}
