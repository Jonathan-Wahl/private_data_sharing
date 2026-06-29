import { Component, OnInit } from '@angular/core';

import { DownloadHistoryService, DownloadRecord } from '../../services/download-history';

@Component({
  selector: 'app-history',
  templateUrl: './history.page.html',
  styleUrls: ['./history.page.scss'],
  standalone: false,
})
export class HistoryPage implements OnInit {
  records: DownloadRecord[] = [];

  constructor(private readonly history: DownloadHistoryService) {}

  async clear(): Promise<void> {
    await this.history.clear();
    this.records = [];
  }

  async ngOnInit(): Promise<void> {
    this.records = await this.history.list();
  }
}
