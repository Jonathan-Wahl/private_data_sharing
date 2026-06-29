import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShareFilePage } from './share-file.page';

describe('ShareFilePage', () => {
  let component: ShareFilePage;
  let fixture: ComponentFixture<ShareFilePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ShareFilePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
