// src/app/components/top-categories/top-categories.component.ts
import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Category } from '@app/interfaces/category.interface';
import { CategoriesService } from '@app/services/categories.service';

@Component({
  selector: 'app-top-categories',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './top-categories.html',
  styleUrls: ['top-categories.scss']
})
export class TopCategories implements OnInit {
  private svc = inject(CategoriesService);

  @Input() categories: Category[] = [];
  iconUrlFn = (c: Category) => this.svc.buildIconUrl(c);

  async ngOnInit() {
    if (this.categories.length === 0) {
      this.svc.listTop(8).subscribe(cats => this.categories = cats);
      await this.svc.subscribe(async () => {
        this.svc.listTop(8).subscribe(cats => this.categories = cats);
      });
    }
  }
}
