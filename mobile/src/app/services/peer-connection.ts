import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface PeerConnectionSession {
  channel: RTCDataChannel;
  connection: RTCPeerConnection;
  messages$: BehaviorSubject<ArrayBuffer[]>;
}

@Injectable({
  providedIn: 'root',
})
export class PeerConnectionService {
  createSenderSession(label = 'secure-share'): PeerConnectionSession {
    const connection = this.createConnection();
    const channel = connection.createDataChannel(label, { ordered: true });

    return this.createSession(connection, channel);
  }

  createReceiverSession(label = 'secure-share'): Promise<PeerConnectionSession> {
    const connection = this.createConnection();

    return new Promise((resolve) => {
      connection.ondatachannel = (event) => resolve(this.createSession(connection, event.channel));
    });
  }

  async createAnswer(
    connection: RTCPeerConnection,
    offer: RTCSessionDescriptionInit,
  ): Promise<RTCSessionDescriptionInit> {
    await connection.setRemoteDescription(offer);
    const answer = await connection.createAnswer();
    await connection.setLocalDescription(answer);

    return answer;
  }

  async createOffer(connection: RTCPeerConnection): Promise<RTCSessionDescriptionInit> {
    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);

    return offer;
  }

  sendBytes(channel: RTCDataChannel, bytes: Uint8Array): void {
    if (channel.readyState !== 'open') {
      throw new Error('Peer data channel is not open.');
    }

    channel.send(
      bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer,
    );
  }

  private createConnection(): RTCPeerConnection {
    return new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
    });
  }

  private createSession(
    connection: RTCPeerConnection,
    channel: RTCDataChannel,
  ): PeerConnectionSession {
    const messages$ = new BehaviorSubject<ArrayBuffer[]>([]);

    channel.binaryType = 'arraybuffer';
    channel.onmessage = (event: MessageEvent<ArrayBuffer>) => {
      messages$.next([...messages$.value, event.data]);
    };

    return { channel, connection, messages$ };
  }
}
