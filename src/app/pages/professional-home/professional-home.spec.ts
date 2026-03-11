import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProfessionalHome } from './professional-home';

describe('ProfessionalHome', () => {
  let component: ProfessionalHome;
  let fixture: ComponentFixture<ProfessionalHome>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProfessionalHome]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProfessionalHome);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
