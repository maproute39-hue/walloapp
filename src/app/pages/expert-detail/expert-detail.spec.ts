import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpertDetail } from './expert-detail';

describe('ExpertDetail', () => {
  let component: ExpertDetail;
  let fixture: ComponentFixture<ExpertDetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpertDetail]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExpertDetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
