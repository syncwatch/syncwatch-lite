import { Injectable } from '@angular/core';
import Peer, { MediaConnection } from 'peerjs';
import { catchError, first, fromEvent, map, Observable, switchMap, timeout } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RoomService {
  private peer?: Peer;
  public isHost: boolean = true;
  public id?: string;
  public roomId?: string;

  constructor() { }

  setupHostConnection(conn: MediaConnection, stream: MediaStream): void {
    fromEvent(conn, 'close').subscribe(() => {
      console.log('close');
      // this.disconnectUser(conn.connectionId);
    });
    fromEvent(conn, 'error').subscribe((err) => {
      console.error(err);
    });
    fromEvent(conn, 'stream').subscribe((stream) => {
      console.log(stream);
    });
    conn.answer(stream);
  }

  createRoom(stream: MediaStream) {
    this.peer = new Peer();
    return fromEvent(this.peer, 'open').pipe(
      first(),
      map((id) => {
        this.id = String(id);
        this.roomId = this.id;
        this.isHost = true;
        fromEvent(this.peer!, 'call').subscribe((conn) => this.setupHostConnection(<MediaConnection>conn, stream));
        return this.id;
      })
    );
  }

  setupClientConnection(conn: MediaConnection) {
    fromEvent(conn, 'close').subscribe(() => {
      console.log('close');
      // this.disconnect();
    });
    fromEvent(conn, 'error').subscribe((err) => {
      console.error(err);
    });
  }

  joinRoom(username: string, roomId: string, stream: MediaStream): Observable<MediaStream> {
    this.peer = new Peer();
    return fromEvent(this.peer, 'open').pipe(
      first(),
      switchMap((id) => {

        const conn = this.peer!.call(roomId, stream);
        return fromEvent(conn, 'stream').pipe(
          timeout({first: 2000}),
          map((stream) => {
            this.id = String(id);
            this.roomId = roomId;
            this.isHost = false;

            console.log(stream);

            this.setupClientConnection(conn);
            return <MediaStream>stream;
          }),
        );
      }),
    );
  }
}
