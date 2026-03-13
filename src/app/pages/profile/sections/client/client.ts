import { Component } from '@angular/core';
import Swal from 'sweetalert2';
import { AuthPocketbaseService } from '@app/services/auth-pocketbase.service';
import { Router, RouterLink, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-client',
  standalone: true,
  imports: [RouterLink, RouterModule, CommonModule],
  templateUrl: './client.html',
  styleUrl: './client.scss'
})
export class Client {
  constructor(private authService: AuthPocketbaseService, private router: Router) {}


  
  async logout() {
    const res = await Swal.fire({
      title: 'Log out?',
      text: 'You are about to log out of Wallizo.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, log out',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      focusCancel: true,
  
      // 👇 usa tus estilos (no los default de SweetAlert2)
      buttonsStyling: false,
      customClass: {
        popup: 'dr-swal',              // opcional
        confirmButton: 'dr-confirm',   // <-- clase propia
        cancelButton: 'dr-cancel',     // <-- clase propia
      },
    });
    if (!res.isConfirmed) return;
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
