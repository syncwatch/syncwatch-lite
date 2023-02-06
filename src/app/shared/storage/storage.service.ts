import { Injectable } from '@angular/core';
import { firstValueFrom, fromEvent, map, filter, Observable, of, take } from 'rxjs';
import { Movie } from '../movie/movie';
import { MovieFragment } from '../movie/movie-fragment';

@Injectable()
export class StorageService {
    private byteSizes = [
        { v: 1000000000, s: 'GB' },
        { v: 1000000, s: 'MB' },
        { v: 1000, s: 'KB' },
        { v: 1, s: 'B' }
    ];

    private worker!: Worker;
    private workerMessages!: Observable<any>;
    private workerMessageCounter = 0;

    constructor() {
        this.setupWorker();
    }

    private setupWorker(): void {
        if (typeof Worker !== 'undefined') {
            // Create a new
            this.worker = new Worker(new URL('../service/indexeddb.worker', import.meta.url));
            this.workerMessages = fromEvent(this.worker, 'message').pipe(
                map((event => (<any>event).data))
            );
        } else {
            // Web workers are not supported in this environment.
            // You should add a fallback so that your program still executes correctly.
            console.error('worker not supported');
        }
    }

    private workerPostMessage(event: string, data: any = undefined): Promise<any> {
        const mCounter = this.workerMessageCounter;
        this.workerMessageCounter++;
        this.worker.postMessage({ counter: mCounter, event, data });
        return firstValueFrom(this.workerMessages.pipe(
            filter(({counter}) => counter === mCounter),
            map((o: any) => {
                if ('data' in o) return o.data;
                if ('error' in o) throw new Error(o);
                throw new Error(o);
            }),
            take(1),
        ));
    }

    bytesToReadable(b: number | undefined): string {
        if (b === undefined) return "Unknown";
        for (let byteSize of this.byteSizes) {
            if (b >= byteSize.v) return `${(b / byteSize.v).toFixed()} ${byteSize.s}`;
        }
        return b.toFixed();
    }

    async isStoragePersisted(): Promise<boolean> {
        return await navigator.storage && navigator.storage.persisted ?
            navigator.storage.persisted() :
            Promise.reject('storage not available')
    }

    async persist(): Promise<boolean> {
        return await navigator.storage && navigator.storage.persist ?
            navigator.storage.persist() :
            Promise.reject('storage not available');
    }

    async getStorageEstimate(): Promise<StorageEstimate> {
        return await navigator.storage && navigator.storage.estimate ?
            navigator.storage.estimate() :
            Promise.reject('storage not available');
    }

    async getStorageEstimateReadable(): Promise<{ quota: string, usage: string }> {
        return await firstValueFrom<{ quota: string, usage: string }>(of(await this.getStorageEstimate()).pipe(
            map(((est: StorageEstimate) => {
                return { quota: this.bytesToReadable(est.quota), usage: this.bytesToReadable(est.usage) };
            }))
        ));
    }

    async getIndexedDBEstimate(): Promise<StorageEstimate> {
        return await firstValueFrom<StorageEstimate>(of(await this.getStorageEstimate()).pipe(
            map(((est: StorageEstimate) => {
                let usage = est.usage;
                const _est = <any>est;
                if (_est.usageDetails) {
                    usage = 0;
                    if (_est.usageDetails.indexedDB) usage = _est.usageDetails.indexedDB;
                }
                return { quota: est.quota, usage: usage };
            }))
        ));
    }

    async getIndexedDBEstimateReadable(): Promise<{ quota: string, usage: string }> {
        return await firstValueFrom<{ quota: string, usage: string }>(of(await this.getIndexedDBEstimate()).pipe(
            map(((est: StorageEstimate) => {
                return { quota: this.bytesToReadable(est.quota), usage: this.bytesToReadable(est.usage) };
            }))
        ));
    }

    async tryPersistWithoutPromtingUser(): Promise<string> {
        if (!navigator.storage || !navigator.storage.persisted) {
            return "never";
        }
        let persisted = await navigator.storage.persisted();
        if (persisted) {
            return "persisted";
        }
        if (!navigator.permissions || !navigator.permissions.query) {
            return "prompt"; // It MAY be successful to prompt. Don't know.
        }
        const permission = await navigator.permissions.query({
            name: "persistent-storage"
        });
        if (permission.state === "granted") {
            persisted = await navigator.storage.persist();
            if (persisted) {
                return "persisted";
            } else {
                throw new Error("Failed to persist");
            }
        }
        if (permission.state === "prompt") {
            return "prompt";
        }
        return "never";
    }

    async getMovies(): Promise<Movie[]> {
        return await this.workerPostMessage('getMovies');
    }

    async getMovie(id: string): Promise<Movie | undefined> {
        return await this.workerPostMessage('getMovie', id);
    }

    async putMovie(movie: Movie): Promise<void> {
        return await this.workerPostMessage('putMovie', movie);
    }

    async putMovieWithBlob(movie: Movie, blob: Blob): Promise<void> {
      await this.workerPostMessage('putMovieWithBlob', {movie, blob});
    }

    async putMovieFragment(fragment: MovieFragment): Promise<void> {
      await this.workerPostMessage('putMovieFragment', fragment);
    }

    async clearIndexDB(): Promise<void> {
      return await this.workerPostMessage('clearIndexDB');
  }

    async deleteMovieAndFragments(movie_id: string): Promise<void> {
        return await this.workerPostMessage('deleteMovieAndFragments', movie_id);
    }
}
