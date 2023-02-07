import { Injectable } from '@angular/core';
import Peer, { DataConnection } from 'peerjs';
import { fromEvent, Observable, switchMap, map, first, timeout, BehaviorSubject, interval, Subject, catchError, of } from 'rxjs';
import { JoinRoomPacket } from '../packets/join-room.packet';
import { Packet } from '../packets/packet';
import { HostVisitor } from './host.visitor';
import { ClientVisitor } from './client.visitor';
import { RoomState } from './room-state';
import { User } from './user';
import { RoomStatePacket as RoomStatePacket } from '../packets/room-state.packet';
import { PingPacket } from '../packets/ping.packet';
import { StorageService } from '../storage/storage.service';
import { MovieFragmentPacket } from '../packets/movie-fragment.packet';

@Injectable()
export class RoomService {
  private peer!: Peer;
  public isHost?: boolean;
  public id?: string;
  public me?: User;
  public roomState = new BehaviorSubject<RoomState | undefined>(undefined);
  private connections: { [key: string]: DataConnection } = {};
  private awaitingPackages: { [key: string]: Subject<Packet> } = {};
  private pingInterval = 5000;
  private pingTimeout = 3000;

  constructor(
    public storageService: StorageService,
  ) {
    interval(this.pingInterval).subscribe(() => {
      if (this.isHost) this.pingConnections();
    });
  }

  sendWaitResponseTo(connId: string, packet: Packet): Observable<Packet> {
    const conn = this.connections[connId];
    if (!conn) of(undefined);
    return this.sendWaitResponse(conn, packet);
  }

  sendWaitResponse(conn: DataConnection, packet: Packet): Observable<Packet> {
    const hash = Math.random().toString(36).substring(2);
    const subject = new Subject<Packet>();
    this.awaitingPackages[hash] = subject;
    packet.id = hash;
    conn.send(packet);
    return subject.pipe(first());
  }

  pingConnection(conn: DataConnection) {
    this.sendWaitResponse(conn, new PingPacket(Date.now())).pipe(
      timeout(this.pingTimeout),
      catchError(() => {
        console.error('user timed out', conn.connectionId);
        // this.disconnectUser(conn.connectionId);
        return of(undefined);
      })
    ).subscribe((packet) => {
      if (packet === undefined) return;
      Packet.accept(new HostVisitor(this, conn), packet);
    });
  }

  pingConnections() {
    for (let conn of Object.values(this.connections)) {
      this.pingConnection(conn);
    }
  }

  disconnect() {
    this.roomState.next(undefined);
    this.connections = {};
    if (this.peer) {
      this.peer.destroy();
    }
  }

  disconnectUser(connId: string) {
    this.roomState.pipe(
      first()
    ).subscribe((roomState) => {
      if (roomState === undefined) return;
      if (connId in this.connections) {
        this.connections[connId].close();
        delete this.connections[connId];
      }
      if (connId in roomState.users) {
        delete roomState.users[connId];
        this.setRoomState(roomState);
      }
    });
  }

  broadcast(packet: Packet) {
    for (let conn of Object.values(this.connections)) {
      if (conn.open) conn.send(packet);
    }
  }

  setupHostConnection(conn: DataConnection) {
    this.connections[conn.connectionId] = conn;
    const v = new HostVisitor(this, conn);
    fromEvent(conn, 'close').subscribe(() => {
      // console.error('disconnect', conn.connectionId);
      this.disconnectUser(conn.connectionId);
    });
    fromEvent(conn, 'error').subscribe((err) => {
      console.error(err);
    });
    fromEvent(conn, 'data').subscribe((data) => {
      const packet = <Packet>data;
      if (packet.id !== undefined && packet.id in this.awaitingPackages) {
        this.awaitingPackages[packet.id].next(packet);
        return;
      }
      Packet.accept(v, packet);
    });
  }

  setupClientConnection(conn: DataConnection) {
    this.connections[conn.connectionId] = conn;
    this.broadcast(new JoinRoomPacket(this.me!));
    const v = new ClientVisitor(this, conn);
    fromEvent(conn, 'close').pipe(
      first(),
    ).subscribe(() => {
      console.error('reconnecting', conn.connectionId);
      // this.disconnect();
      this.roomState.pipe(first()).subscribe((roomState) => this.joinRoom(this.me!.name, roomState!.id).subscribe())
    });
    fromEvent(conn, 'error').subscribe((err) => {
      console.error(err);
    });
    fromEvent(conn, 'data').subscribe((data) => {
      const packet = <Packet>data;
      if (packet.id !== undefined && packet.id in this.awaitingPackages) {
        this.awaitingPackages[packet.id].next(packet);
        return;
      }
      Packet.accept(v, packet);
    });
  }

  createRoom(username: string): Observable<string> {
    this.peer = new Peer('');

    return fromEvent(this.peer, 'open').pipe(
      first(),
      map((id) => {
        this.id = String(id);
        this.me = { name: username, ping: 0 };
        this.isHost = true;
        this.roomState.next({
          users: { [this.id]: this.me },
          id: this.id,
        });
        fromEvent(this.peer, 'connection').subscribe((conn) => this.setupHostConnection(<DataConnection>conn));
        return this.id;
      })
    );
  }

  joinRoom(username: string, roomId: string): Observable<string> {
    this.peer = new Peer('');
    return fromEvent(this.peer, 'open').pipe(
      first(),
      switchMap((id) => {
        const conn = this.peer.connect(roomId);
        return fromEvent(conn, 'open').pipe(
          timeout(2000),
          first(),
          switchMap(() => {
            this.id = String(id);
            this.me = { name: username, ping: -1 };
            this.isHost = false;
            this.setupClientConnection(conn);
            return this.roomState.pipe(
              first((roomState) => roomState !== undefined),
              timeout(2000),
              map((roomState) => {
                if (roomState === undefined) throw new Error('Could not connect');
                return roomState.id;
              })
            );
          }),
        );
      }),
    );
  }

  setRoomState(roomState: RoomState): void {
    this.roomState.next(roomState);
    this.broadcast(new RoomStatePacket(roomState));
  }


  cache: {[connId: string]: {[movieId: string]: {[start: number]: {last: number, times: number}}}} = {};
  sendMovieFragment(conn: DataConnection, packet: MovieFragmentPacket): void {
    if (!(conn.connectionId in this.cache)) {
      this.cache[conn.connectionId] = {};
    }
    if (!(packet.fragment.movie_id in this.cache[conn.connectionId])) {
      this.cache[conn.connectionId][packet.fragment.movie_id] = {};
    }
    if (!(packet.fragment.start in this.cache[conn.connectionId][packet.fragment.movie_id])) {
      this.cache[conn.connectionId][packet.fragment.movie_id][packet.fragment.start] = {last: 0, times: 0};
    }
    const now = Date.now();
    console.log(packet.fragment.movie_id, packet.fragment.start, this.cache[conn.connectionId][packet.fragment.movie_id][packet.fragment.start].times, now - this.cache[conn.connectionId][packet.fragment.movie_id][packet.fragment.start].last);
    if (this.cache[conn.connectionId][packet.fragment.movie_id][packet.fragment.start].last < now - 2000) {
      conn.send(packet);
      this.cache[conn.connectionId][packet.fragment.movie_id][packet.fragment.start].last = now;
      this.cache[conn.connectionId][packet.fragment.movie_id][packet.fragment.start].times += 1;
    }
  }
}
