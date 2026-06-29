import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { TorrentPageRoutingModule } from './torrent-routing.module';
import { TorrentPage } from './torrent.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, TorrentPageRoutingModule],
  declarations: [TorrentPage],
})
export class TorrentPageModule {}
