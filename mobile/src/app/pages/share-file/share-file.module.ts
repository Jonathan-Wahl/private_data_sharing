import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { ShareFilePageRoutingModule } from './share-file-routing.module';
import { ShareFilePage } from './share-file.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, ShareFilePageRoutingModule],
  declarations: [ShareFilePage],
})
export class ShareFilePageModule {}
