import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeaturedServices } from './featured-services';

describe('FeaturedServices', () => {
  let component: FeaturedServices;
  let fixture: ComponentFixture<FeaturedServices>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeaturedServices]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FeaturedServices);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
