import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { ExpertsService, ExpertView } from 'src/app/services/experts.service';
import { switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-expert-detail',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './expert-detail.html',
  styleUrl: './expert-detail.scss'
})
export class ExpertDetail {
  expert$!: Observable<ExpertView | null>;
  private id!: string;
  
  constructor(private route: ActivatedRoute, private svc: ExpertsService, public router: Router) {
    this.expert$ = this.route.paramMap.pipe(
      switchMap(pm => {
        this.id = pm.get('id')!;
        return this.svc.watchById(this.id);
      })
    );
  }

  ngOnDestroy(): void {
    if (this.id) this.svc.unwatchById(this.id);
  }
}
