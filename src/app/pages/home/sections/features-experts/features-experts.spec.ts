import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FeaturesExperts } from './features-experts';

describe('FeaturesExperts', () => {
  let component: FeaturesExperts;
  let fixture: ComponentFixture<FeaturesExperts>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FeaturesExperts]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FeaturesExperts);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
