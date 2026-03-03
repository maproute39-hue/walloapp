import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopProviders } from './top-providers';

describe('TopProviders', () => {
  let component: TopProviders;
  let fixture: ComponentFixture<TopProviders>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopProviders]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TopProviders);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
