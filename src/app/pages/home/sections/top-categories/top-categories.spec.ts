import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopCategories } from './top-categories';

describe('TopCategories', () => {
  let component: TopCategories;
  let fixture: ComponentFixture<TopCategories>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopCategories]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TopCategories);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
