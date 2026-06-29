import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: 'home',
    loadChildren: () => import('./home/home.module').then((m) => m.HomePageModule),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'share-text',
    loadChildren: () =>
      import('./pages/share-text/share-text.module').then((m) => m.ShareTextPageModule),
  },
  {
    path: 'share-file',
    loadChildren: () =>
      import('./pages/share-file/share-file.module').then((m) => m.ShareFilePageModule),
  },
  {
    path: 'receive',
    loadChildren: () => import('./pages/receive/receive.module').then((m) => m.ReceivePageModule),
  },
  {
    path: 'torrent',
    loadChildren: () => import('./pages/torrent/torrent.module').then((m) => m.TorrentPageModule),
  },
  {
    path: 'history',
    loadChildren: () => import('./pages/history/history.module').then((m) => m.HistoryPageModule),
  },
  {
    path: 'privacy',
    loadChildren: () => import('./pages/privacy/privacy.module').then((m) => m.PrivacyPageModule),
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
