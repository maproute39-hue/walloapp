// features-experts.ts
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { ExpertsService, ExpertView } from '@app/services/experts.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AsyncPipe } from '@angular/common';

@Component({
  selector: 'app-features-experts',
  standalone: true,
  imports: [CommonModule, RouterModule, AsyncPipe],
  templateUrl: './features-experts.html',
  styleUrl: './features-experts.scss'
})
export class FeaturesExperts implements OnInit {
  topExperts$!: Observable<ExpertView[]>;

  constructor(private expertsService: ExpertsService, private router: Router) {}

  ngOnInit(): void {
    this.topExperts$ = this.expertsService.watchAllUnfiltered().pipe(
      map(list => list
        // ✅ Filtro aprobado: status=true (sin exigir verified para no excluir)
        .filter(u => !!u && (u.status === true))
        // ✅ Filtro rol: soporta string o array
        .filter(u => {
          const val = u.rolw;
          const roles = Array.isArray(val) ? val.map(v => `${v}`.toLowerCase()) : [`${val ?? ''}`.toLowerCase()];
          return roles.includes('expert') || roles.includes('provider');
        })
        // ✅ Orden: rating desc, luego updated desc
        .sort((a, b) => {
          const ra = Number.isFinite(a.rating as number) ? (a.rating as number) : -Infinity;
          const rb = Number.isFinite(b.rating as number) ? (b.rating as number) : -Infinity;
          if (rb !== ra) return rb - ra;
          const ua = a['updated'] ? new Date(a['updated']).getTime() : 0;
          const ub = b['updated'] ? new Date(b['updated']).getTime() : 0;
          return ub - ua;
        })
        // ✅ Top 10
        .slice(0, 10)
      )
    );
  }

  goToExpert(expert: ExpertView) {
    this.router.navigate(['/expert', expert.id]);
  }
}
