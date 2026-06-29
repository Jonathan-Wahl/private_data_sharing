import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TorrentPage } from './torrent.page';

describe('TorrentPage', () => {
  let component: TorrentPage;
  let fixture: ComponentFixture<TorrentPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(TorrentPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
