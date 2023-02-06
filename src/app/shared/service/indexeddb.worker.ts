/// <reference lib="webworker" />

import { Movie } from "../movie/movie";
import { MovieFragment } from "../movie/movie-fragment";
import { db } from "./db";

async function putMovie(movie: Movie): Promise<any> {
    return await db.movies.put(movie, movie.id);
}

async function putMovieWithBlob(data: {movie: Movie, blob: Blob}): Promise<any> {
  const movie = {...data.movie};
  const arrayBuffer = await data.blob.arrayBuffer();
  await putMovie(movie);
  return await putMovieFragment({movie_id: movie.id!, start: 0, end: arrayBuffer.byteLength, data: arrayBuffer});
}

async function putSingleMovieFragment(fragment: MovieFragment): Promise<void> {
  const frag = await db.movie_fragments.get([fragment.movie_id, fragment.start]);
  if (frag) await db.buffers.delete(frag.data_id);
  const data_id = await db.buffers.put(fragment.data);
  await db.movie_fragments.put({
      data_id: data_id,
      movie_id: fragment.movie_id,
      start: fragment.start,
      end: fragment.end,
  });
}

async function putMovieFragment(fragment: MovieFragment): Promise<void> {
    const movieFragmentSlices = 2000000;
    if (fragment.data.byteLength < movieFragmentSlices) {
        return await putSingleMovieFragment(fragment);
    }
    let currentOffset = 0;
    let remainingBytes = fragment.data.byteLength;
    while (remainingBytes > 0) {
        const slicedByteLength = Math.min(remainingBytes, movieFragmentSlices);
        await putSingleMovieFragment({
          movie_id: fragment.movie_id,
          data: fragment.data.slice(currentOffset, currentOffset + slicedByteLength),
          start: fragment.start + currentOffset,
          end: fragment.start + currentOffset + slicedByteLength,
        });
        currentOffset += slicedByteLength;
        remainingBytes -= slicedByteLength;
    }
}

async function getMovies(): Promise<Movie[]> {
    return await db.movies.toArray();
}

async function getMovie(id: string): Promise<Movie | undefined> {
    return await db.movies.get(id);
}

async function clearIndexDB(): Promise<void> {
  await db.delete();
}

async function deleteMovieAndFragments(movie_id: string): Promise<void> {
    for (let fragment of await (await db.movie_fragments.where({'movie_id': movie_id}).sortBy('start')).reverse()) {
        await db.buffers.delete(fragment.data_id);
        await db.movie_fragments.delete([fragment.movie_id, fragment.start]);
        await db.movies.update(movie_id, { downloaded_length: fragment.start });
    }
    await db.movies.delete(movie_id);
}

const eventFunctions: { [K: string]: (data: any) => any } = {
    'putMovie': putMovie,
    'putMovieWithBlob': putMovieWithBlob,
    'getMovies': getMovies,
    'getMovie': getMovie,
    'putMovieFragment': putMovieFragment,
    'clearIndexDB': clearIndexDB,
    'deleteMovieAndFragments': deleteMovieAndFragments,
};

addEventListener('message', async ({ data }) => {
    if (!data || data.counter === undefined || data.event === undefined || !eventFunctions[data.event]) {
        // console.log(data);
        console.error('message has no counter or event invalid');
        return;
    }

    try {
        postMessage({ counter: data.counter, data: await eventFunctions[data.event](data.data) });
    } catch (e: any) {
        if (e instanceof Error) {
            postMessage({ counter: data.counter, error: e.message });
        } else {
            postMessage({ counter: data.counter, error: 'unknown error' });
        }
    }
});
