import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ExpertsService, ExpertView } from '@app/services/experts.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AsyncPipe, NgFor, NgIf } from '@angular/common';

@Component({
  selector: 'app-expert',
  standalone: true,
  imports: [CommonModule, AsyncPipe, NgFor, NgIf],
  templateUrl: './expert.html',
  styleUrl: './expert.scss'
})
export class Expert {
  /** Todos los aprobados (filtrados client-side) */
  experts$: Observable<ExpertView[]>;

  constructor(public router: Router, private expertService: ExpertsService) {
    this.experts$ = this.expertService.watchAllUnfiltered().pipe(
      map(list => list
        // ✅ Aprobados
        .filter(u => u?.status === true)                       // si necesitas también verified: && u?.verified === true
        // ✅ Rol (soporta string o array)
        .filter(u => {
          const v = u.rolw;
          const roles = Array.isArray(v) ? v.map(x => `${x}`.toLowerCase()) : [`${v ?? ''}`.toLowerCase()];
          return roles.includes('expert') || roles.includes('provider');
        })
        // (Opcional) ordenar por rating desc y updated desc
        .sort((a, b) => {
          const ra = Number.isFinite(a.rating as number) ? (a.rating as number) : -Infinity;
          const rb = Number.isFinite(b.rating as number) ? (b.rating as number) : -Infinity;
          if (rb !== ra) return rb - ra;
          const ua = a['updated'] ? new Date(a['updated']).getTime() : 0;
          const ub = b['updated'] ? new Date(b['updated']).getTime() : 0;
          return ub - ua;
        })
      )
    );
  }
  goToExpertDetail(expertId: string) {
  this.router.navigate(['/expertDetail', expertId]); // 👈 camelCase igual a app.routes
}
}
