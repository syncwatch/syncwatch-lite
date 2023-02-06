/// <reference lib="webworker" />

import { db } from "./db";

const requestSleep = 200;
const maxTrys = 200;

async function getMovieStream(event: FetchEvent, url: URL, trys: number = 0): Promise<Response | undefined> {
    const movie_id = url.searchParams.get('id');
    if (movie_id === null) return;
    const movie = await db.movies.get(movie_id);

    if (movie && trys > maxTrys) return new Response(
      undefined,
      <any>{
        status: 206,
        statusText: 'Partial Content',
        headers: {
            'Accept-Ranges': 'bytes',
            'Content-Disposition': 'inline',
            'Content-Type': movie.mime_type,
            'Content-Length': 0,
            'Content-Range': `bytes 0-/${movie.content_length}`,
        },
      },
    );

    if (movie === undefined || movie.downloaded_length < movie.content_length) {
      await db.requested_movie_fragment.put({movie_id: movie_id, data_id: 0, start: -1, end: -1});
      await new Promise(r => setTimeout(r, requestSleep));
      return await getMovieStream(event, url, trys + 1);
    }

    const rangeRequest = event.request.headers.get('range') || '';
    const byteRanges = rangeRequest.match(/bytes=(?<from>[0-9]+)?-(?<to>[0-9]+)?/);
    const rangeFrom = (byteRanges && byteRanges.groups && byteRanges.groups['from']) ? Number(byteRanges.groups['from']) : 0;
    let rangeTo = (byteRanges && byteRanges.groups && byteRanges.groups['to']) ? Number(byteRanges.groups['to']) : rangeFrom + 10000000;


    const {buffers, start, end} = await db.getMovieBuffer(movie_id, rangeFrom, rangeTo);

    if (buffers.length == 0) {
      if (trys % 100 == 0) await db.requested_movie_fragment.put({movie_id: movie_id, data_id: 0, start: rangeFrom, end: rangeTo});

      await new Promise(r => setTimeout(r, requestSleep));
      return await getMovieStream(event, url, trys + 1);
    }

    const blob = new Blob(buffers, { type: movie.mime_type });

    const responseOpts: any = {
        status: end - start < movie.content_length ? 206 : 200,
        statusText: end - start < movie.content_length ? 'Partial Content' : 'OK',
        headers: {
            'Accept-Ranges': 'bytes',
            'Content-Disposition': 'inline',
            'Content-Type': movie.mime_type,
            'Content-Length': end - start,
        },
    };
    if (rangeRequest) {
        responseOpts.headers['Content-Range'] = `bytes ${start}-${end - 1}/${movie.content_length}`;
    }

    return new Response(
        blob.stream(),
        responseOpts,
    );
}

const MAPPED_REQUESTS: {[key: string]: (event: any, url: URL) => Promise<any>} = {
  '/movie': getMovieStream,
};

addEventListener('fetch', (event: any) => {
    const url = new URL(event.request.url);
    if (url.pathname in MAPPED_REQUESTS) {
        event.respondWith((async () => {
          const res = await MAPPED_REQUESTS[url.pathname](event, url);
          if (res) return res;
          return await fetch(event.request);
      })());
    }
});

// Import angular serviceworker
importScripts('ngsw-worker.js');
