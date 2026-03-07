import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpertReviews } from './expert-reviews';

describe('ExpertReviews', () => {
  let component: ExpertReviews;
  let fixture: ComponentFixture<ExpertReviews>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpertReviews]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExpertReviews);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
