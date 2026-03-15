import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PortfolioGallery } from './portfolio-gallery';

describe('PortfolioGallery', () => {
  let component: PortfolioGallery;
  let fixture: ComponentFixture<PortfolioGallery>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PortfolioGallery]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PortfolioGallery);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
