import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { VpnPage } from './vpn.page';

const routes: Routes = [
  {
    path: '',
    component: VpnPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class VpnPageRoutingModule {}
