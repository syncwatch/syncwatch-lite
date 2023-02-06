import Dexie, { Table } from 'dexie';
import { Movie } from '../movie/movie';
import { MovieFragmentIndex } from '../movie/movie-fragment';

export class AppDB extends Dexie {
    buffers!: Table<ArrayBuffer, number>;
    movies!: Table<Movie, string>;
    movie_fragments!: Table<MovieFragmentIndex, [string, number]>;
    requested_movie_fragment!: Table<MovieFragmentIndex, string>;

    constructor() {
        super('syncwatch');
        this.version(1).stores({
            buffers: '++id',
            movies: 'id',
            movie_fragments: '[movie_id+start], data_id',
            requested_movie_fragment: 'movie_id',
        });
    }

    async getMovieBuffer(movie_id: string, rangeFrom: number, rangeTo: number): Promise<{buffers: ArrayBuffer[], start: number, end: number}> {
      let fragments = await this.movie_fragments.where({'movie_id': movie_id}).sortBy('start');
      if (fragments.length == 0) return {buffers: [], start: 0, end: -1};

      let startI = 0;
      while (startI < fragments.length - 2) {
          if (fragments[startI + 1].start > rangeFrom) break;
          startI++;
      }

      let endI = startI;
      while (endI < fragments.length - 2) {
        if (fragments[endI].end != fragments[endI + 1].start || fragments[endI + 1].start > rangeTo) break;
        endI++;
      }

      const start = fragments[startI].start;
      const end = fragments[endI].end;

      if (end <= rangeFrom) return {buffers: [], start: 0, end: -1};

      fragments = fragments.splice(startI, endI - startI + 1);

      return {
        buffers: <ArrayBuffer[]>await db.buffers.bulkGet(fragments.map(v => v.data_id)),
        start: start,
        end: end,
      };
    }
}

export const db = new AppDB();
