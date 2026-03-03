import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BiografyComponent } from './biografy.component';

describe('BiografyComponent', () => {
  let component: BiografyComponent;
  let fixture: ComponentFixture<BiografyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BiografyComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BiografyComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
