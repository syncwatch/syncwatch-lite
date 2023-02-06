import { MovieFragment } from "../movie/movie-fragment";
import { Packet } from "./packet";
import { PACKET_TYPES } from "./packet-types";
import { Visitor } from "./visitor";

export class MovieFragmentPacket extends Packet {
  constructor(public fragment: MovieFragment) {
    super();
  }

  static override accept<T>(v: Visitor<T>, packet: Packet): T {
    return v.visitMovieFragment(<MovieFragmentPacket>packet);
  };
}
PACKET_TYPES.push(MovieFragmentPacket);
