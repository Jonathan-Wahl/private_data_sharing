import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { TorrentPage } from './torrent.page';

const routes: Routes = [
  {
    path: '',
    component: TorrentPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class TorrentPageRoutingModule {}
