import { DataConnection } from "peerjs";
import { first } from "rxjs";
import { JoinRoomPacket } from "../packets/join-room.packet";
import { MovieFragmentPacket } from "../packets/movie-fragment.packet";
import { PingPacket } from "../packets/ping.packet";
import { RoomStatePacket } from "../packets/room-state.packet";
import { Visitor } from "../packets/visitor";
import { db } from "../service/db";
import { RoomService } from "./room.service";

export class HostVisitor extends Visitor<void> {
  constructor(private roomService: RoomService, private clientConn: DataConnection) {
    super();
  }

  override visitPing(e: PingPacket): void {
    this.roomService.roomState.pipe(
      first()
    ).subscribe((roomState) => {
      if (roomState === undefined) return;
      if (!(this.clientConn.connectionId in roomState.users)) return;
      roomState.users[this.clientConn.connectionId].ping = Date.now() - e.start;
      this.roomService.setRoomState(roomState);
    });
  }

  override visitJoinRoom(e: JoinRoomPacket): void {
    this.roomService.roomState.pipe(
      first()
    ).subscribe((roomState) => {
      if (roomState === undefined) return;
      for (let user of Object.values(roomState.users)) {
        if (user.name === e.me.name) {
          console.log('deny join of username: ' + e.me.name);
          this.roomService.disconnectUser(this.clientConn.connectionId);
          return;
        }
      }
      roomState.users[this.clientConn.connectionId] = e.me;
      this.roomService.setRoomState(roomState);
      this.roomService.pingConnection(this.clientConn);
    });
  }

  override visitMovieFragment(e: MovieFragmentPacket): void {
    // console.log(e);
    (async () => {
      const {buffers, start, end} = await db.getMovieBuffer(e.fragment.movie_id, e.fragment.start, e.fragment.end);
      // console.log(start, end, buffers.length);
      let offset = 0;
      for (let buffer of buffers) {
        this.roomService.sendMovieFragment(this.clientConn, new MovieFragmentPacket({
          movie_id: e.fragment.movie_id,
          start: start + offset,
          end: start + offset + buffer.byteLength,
          data: buffer,
        }));
        offset += buffer.byteLength;
      }
    })();
  }
}
