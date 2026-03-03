import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EmergencyInfo } from './emergency-info';

describe('EmergencyInfo', () => {
  let component: EmergencyInfo;
  let fixture: ComponentFixture<EmergencyInfo>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmergencyInfo]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EmergencyInfo);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
