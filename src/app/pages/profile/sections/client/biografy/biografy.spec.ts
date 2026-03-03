import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Biografy } from './biografy';

describe('Biografy', () => {
  let component: Biografy;
  let fixture: ComponentFixture<Biografy>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Biografy]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Biografy);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
