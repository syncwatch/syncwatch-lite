import { Movie } from "../movie/movie";
import { User } from "./user";

export interface RoomState {
  users: {[key: string]: User};
  id: string;
  movie?: Movie
}
