import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BannerCarousel } from './banner-carousel.component';

describe('BannerCarousel', () => {
  let component: BannerCarousel;
  let fixture: ComponentFixture<BannerCarousel>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BannerCarousel]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BannerCarousel);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
