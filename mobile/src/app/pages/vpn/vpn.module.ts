import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

import { VpnPageRoutingModule } from './vpn-routing.module';
import { VpnPage } from './vpn.page';

@NgModule({
  imports: [CommonModule, FormsModule, IonicModule, VpnPageRoutingModule],
  declarations: [VpnPage],
})
export class VpnPageModule {}
