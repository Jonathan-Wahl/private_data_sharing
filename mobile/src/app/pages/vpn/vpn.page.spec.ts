import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VpnPage } from './vpn.page';

describe('VpnPage', () => {
  let component: VpnPage;
  let fixture: ComponentFixture<VpnPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(VpnPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
