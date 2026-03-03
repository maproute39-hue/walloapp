import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddGallery } from './add-gallery';

describe('AddGallery', () => {
  let component: AddGallery;
  let fixture: ComponentFixture<AddGallery>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddGallery]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddGallery);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
