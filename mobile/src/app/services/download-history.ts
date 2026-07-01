import { Injectable } from '@angular/core';

import { LocalStorageService } from './local-storage';

export type DownloadRecordKind = 'file-share' | 'text-share';
export type DownloadRecordStatus = 'active' | 'complete' | 'failed' | 'paused' | 'queued';

export interface DownloadRecord {
  bytesReceived?: number;
  bytesTotal?: number;
  createdAt: string;
  id: string;
  kind: DownloadRecordKind;
  name: string;
  status: DownloadRecordStatus;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root',
})
export class DownloadHistoryService {
  private readonly key = 'history:downloads';

  constructor(private readonly storage: LocalStorageService) {}

  async add(record: Omit<DownloadRecord, 'createdAt' | 'updatedAt'>): Promise<DownloadRecord> {
    const now = new Date().toISOString();
    const next: DownloadRecord = { ...record, createdAt: now, updatedAt: now };
    const records = await this.list();

    await this.storage.setJson(this.key, [next, ...records]);

    return next;
  }

  async clear(): Promise<void> {
    await this.storage.setJson(this.key, []);
  }

  async list(): Promise<DownloadRecord[]> {
    return this.storage.getJson<DownloadRecord[]>(this.key, []);
  }

  async update(
    id: string,
    patch: Partial<Omit<DownloadRecord, 'createdAt' | 'id'>>,
  ): Promise<DownloadRecord[]> {
    const records = await this.list();
    const updated = records.map((record) =>
      record.id === id ? { ...record, ...patch, updatedAt: new Date().toISOString() } : record,
    );

    await this.storage.setJson(this.key, updated);

    return updated;
  }
}
