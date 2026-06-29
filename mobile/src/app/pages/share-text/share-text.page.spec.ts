import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShareTextPage } from './share-text.page';

describe('ShareTextPage', () => {
  let component: ShareTextPage;
  let fixture: ComponentFixture<ShareTextPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ShareTextPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
