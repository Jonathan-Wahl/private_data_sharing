import { Injectable } from '@angular/core';

import { environment } from '../../environments/environment';

import { LocalStorageService } from './local-storage';
import { createUuid } from './uuid';

export interface SignalingMessage {
  body: unknown;
  createdAt: string;
  id: string;
  senderId: string;
  type: 'answer' | 'candidate' | 'encrypted-metadata' | 'offer';
}

export interface SignalingRoom {
  createdAt: string;
  expiresAt: string;
  id: string;
  messages: SignalingMessage[];
}

interface ApiSignalingMessage {
  body: unknown;
  created_at: string;
  id: string;
  sender_id: string;
  type: SignalingMessage['type'];
}

interface ApiSignalingRoom {
  created_at: string;
  expires_at: string;
  id: string;
  messages: ApiSignalingMessage[];
}

interface ApiCreateMessageResponse {
  room: ApiSignalingRoom;
}

@Injectable({
  providedIn: 'root',
})
export class SignalingService {
  private readonly namespace = 'signal';
  private readonly roomTtlMs = 10 * 60 * 1000;

  constructor(private readonly storage: LocalStorageService) {}

  async appendMessage(
    roomId: string,
    message: Omit<SignalingMessage, 'createdAt' | 'id'>,
  ): Promise<SignalingRoom> {
    if (this.usesApi()) {
      return this.appendMessageViaApi(roomId, message);
    }

    return this.appendMessageLocally(roomId, message);
  }

  async createRoom(): Promise<SignalingRoom> {
    if (this.usesApi()) {
      return this.createRoomViaApi();
    }

    return this.createRoomLocally();
  }

  async cleanupExpiredRooms(): Promise<void> {
    if (this.usesApi()) {
      return;
    }

    const ids = await this.roomIds();
    const activeIds: string[] = [];

    await Promise.all(
      ids.map(async (id) => {
        const room = await this.storage.getJson<SignalingRoom | null>(this.roomKey(id), null);

        if (!room || this.isExpired(room)) {
          await this.storage.remove(this.roomKey(id));
          return;
        }

        activeIds.push(id);
      }),
    );

    await this.storage.setJson(this.indexKey(), activeIds);
  }

  async getRoom(roomId: string): Promise<SignalingRoom | null> {
    if (this.usesApi()) {
      return this.getRoomViaApi(roomId);
    }

    const room = await this.storage.getJson<SignalingRoom | null>(this.roomKey(roomId), null);

    if (!room || this.isExpired(room)) {
      await this.storage.remove(this.roomKey(roomId));
      return null;
    }

    return room;
  }

  private async appendMessageLocally(
    roomId: string,
    message: Omit<SignalingMessage, 'createdAt' | 'id'>,
  ): Promise<SignalingRoom> {
    const room = await this.getRoom(roomId);

    if (!room) {
      throw new Error('Signaling room was not found or has expired.');
    }

    const next: SignalingRoom = {
      ...room,
      messages: [
        ...room.messages,
        {
          ...message,
          createdAt: new Date().toISOString(),
          id: createUuid(),
        },
      ],
    };

    await this.storage.setJson(this.roomKey(roomId), next);

    return next;
  }

  private async appendMessageViaApi(
    roomId: string,
    message: Omit<SignalingMessage, 'createdAt' | 'id'>,
  ): Promise<SignalingRoom> {
    const response = await this.fetchJson<ApiCreateMessageResponse>(
      `${this.apiBaseUrl()}/signaling_rooms/${encodeURIComponent(roomId)}/messages`,
      {
        method: 'POST',
        body: JSON.stringify({
          body: message.body,
          sender_id: message.senderId,
          type: message.type,
        }),
      },
    );

    return this.normalizeRoom(response.room);
  }

  private apiBaseUrl(): string {
    return environment.signalingApiBaseUrl.replace(/\/$/u, '');
  }

  private async createRoomLocally(): Promise<SignalingRoom> {
    await this.cleanupExpiredRooms();

    const now = Date.now();
    const room: SignalingRoom = {
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + this.roomTtlMs).toISOString(),
      id: createUuid(),
      messages: [],
    };
    const ids = await this.roomIds();

    await this.storage.setJson(this.indexKey(), [...new Set([...ids, room.id])]);
    await this.storage.setJson(this.roomKey(room.id), room);

    return room;
  }

  private async createRoomViaApi(): Promise<SignalingRoom> {
    const room = await this.fetchJson<ApiSignalingRoom>(`${this.apiBaseUrl()}/signaling_rooms`, {
      method: 'POST',
      body: JSON.stringify({}),
    });

    return this.normalizeRoom(room);
  }

  private async fetchJson<T>(url: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(url, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(init.headers || {}),
      },
    });

    if (!response.ok) {
      throw new Error(`Signaling API request failed with ${response.status}.`);
    }

    return (await response.json()) as T;
  }

  private async getRoomViaApi(roomId: string): Promise<SignalingRoom | null> {
    const response = await fetch(
      `${this.apiBaseUrl()}/signaling_rooms/${encodeURIComponent(roomId)}`,
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`Signaling API request failed with ${response.status}.`);
    }

    return this.normalizeRoom((await response.json()) as ApiSignalingRoom);
  }

  private isExpired(room: SignalingRoom): boolean {
    return new Date(room.expiresAt).getTime() <= Date.now();
  }

  private normalizeMessage(message: ApiSignalingMessage): SignalingMessage {
    return {
      body: message.body,
      createdAt: message.created_at,
      id: String(message.id),
      senderId: message.sender_id,
      type: message.type,
    };
  }

  private normalizeRoom(room: ApiSignalingRoom): SignalingRoom {
    return {
      createdAt: room.created_at,
      expiresAt: room.expires_at,
      id: room.id,
      messages: room.messages.map((message) => this.normalizeMessage(message)),
    };
  }

  private indexKey(): string {
    return `${this.namespace}:rooms`;
  }

  private roomIds(): Promise<string[]> {
    return this.storage.getJson<string[]>(this.indexKey(), []);
  }

  private roomKey(roomId: string): string {
    return `${this.namespace}:room:${roomId}`;
  }

  private usesApi(): boolean {
    return Boolean(environment.signalingApiBaseUrl.trim());
  }
}
