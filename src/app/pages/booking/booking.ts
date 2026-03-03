import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-booking',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './booking.html',
  styleUrl: './booking.scss'
})
export class Booking {
  constructor(public router: Router) {}
}
