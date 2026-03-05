import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RnewRequest } from './new';

describe('RnewRequest', () => {
  let component: RnewRequest;
  let fixture: ComponentFixture<RnewRequest>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RnewRequest]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RnewRequest);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
