import { DataConnection } from "peerjs";
import { MovieFragmentPacket } from "../packets/movie-fragment.packet";
import { PingPacket } from "../packets/ping.packet";
import { RoomStatePacket } from "../packets/room-state.packet";
import { Visitor } from "../packets/visitor";
import { RoomService } from "./room.service";

export class ClientVisitor extends Visitor<void> {
  constructor(private roomService: RoomService, private clientConn: DataConnection) {
    super()
  }

  override visitPing(e: PingPacket): void {
    this.clientConn.send(e);
  }

  override visitRoomState(e: RoomStatePacket): void {
    this.roomService.roomState.next(e.roomState);
  }

  override visitMovieFragment(e: MovieFragmentPacket): void {
    console.log(e);
    this.roomService.storageService.putMovieFragment(e.fragment);
  }
}
