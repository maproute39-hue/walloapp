import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthPocketbaseService } from '../../services/auth-pocketbase.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notifications.html',
  styleUrl: './notifications.scss'
})
export class Notifications {
constructor(public auth: AuthPocketbaseService) {
}

  getRole() {
    // alert(this.auth.currentUser()?.['type']);
    return this.auth.currentUser()?.['type'];
  }
}
