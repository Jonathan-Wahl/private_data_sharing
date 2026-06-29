import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { ShareTextPageRoutingModule } from './share-text-routing.module';
import { ShareTextPage } from './share-text.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, ShareTextPageRoutingModule],
  declarations: [ShareTextPage],
})
export class ShareTextPageModule {}
