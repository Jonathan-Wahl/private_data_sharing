import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ShareFilePage } from './share-file.page';

const routes: Routes = [
  {
    path: '',
    component: ShareFilePage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ShareFilePageRoutingModule {}
