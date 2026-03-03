import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuscriptionPlan } from './suscription-plan';

describe('SuscriptionPlan', () => {
  let component: SuscriptionPlan;
  let fixture: ComponentFixture<SuscriptionPlan>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuscriptionPlan]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SuscriptionPlan);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
