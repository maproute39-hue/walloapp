import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfessionalReviews } from './professional-reviews';

describe('ProfessionalReviews', () => {
  let component: ProfessionalReviews;
  let fixture: ComponentFixture<ProfessionalReviews>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfessionalReviews]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfessionalReviews);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
