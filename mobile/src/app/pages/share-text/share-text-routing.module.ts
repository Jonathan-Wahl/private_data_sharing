import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { ShareTextPage } from './share-text.page';

const routes: Routes = [
  {
    path: '',
    component: ShareTextPage,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class ShareTextPageRoutingModule {}
