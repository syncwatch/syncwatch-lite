import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { catchError, first, interval, map, of, switchMap } from 'rxjs';
import { FileService } from 'src/app/shared/file/file.service';
import { MediaService } from 'src/app/shared/media/media.service';
import { MovieFragmentPacket } from 'src/app/shared/packets/movie-fragment.packet';
import { RoomState } from 'src/app/shared/room/room-state';
import { RoomService } from 'src/app/shared/room/room.service';
import { db } from 'src/app/shared/service/db';
import { StorageService } from 'src/app/shared/storage/storage.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {

  videoSrc?: string;
  roomState?: RoomState;
  storageUsage: string = './.';

  constructor(
    private roomService: RoomService,
    private fileService: FileService,
    private storageService: StorageService,
    private mediaService: MediaService,
    private route: ActivatedRoute,
    private router: Router,
  ) {
  }

  clearData(): void {
    this.storageService.clearIndexDB();
  }


  ngOnInit(): void {
    interval(10).subscribe(async () => {
      this.storageUsage = (await this.storageService.getStorageEstimateReadable()).usage;
      if (this.roomState?.movie?.id && !this.roomService.isHost) {
        const requestedFragment = await db.requested_movie_fragment.get(this.roomState.movie.id);
        if (requestedFragment) {
          await db.requested_movie_fragment.delete(this.roomState.movie.id);
          console.log('request', requestedFragment);
          this.roomService.broadcast(new MovieFragmentPacket({movie_id: requestedFragment.movie_id, start: requestedFragment.start, end: requestedFragment.end, data: (<any>undefined)}));
        }
      }
    });

    this.roomService.roomState.subscribe((roomState) => {
      this.roomState = roomState;
      if (roomState?.movie?.id) {
        this.videoSrc = `/movie?id=${roomState.movie.id}`;
        this.storageService.putMovie(roomState.movie);
      }
    });

    this.route.paramMap.pipe(
      switchMap((params) => {
        const roomId = params.get('roomId');
        if (roomId && !this.roomService.isHost) {
          return this.roomService.joinRoom('User' + Math.random().toFixed(4).toString().substring(2), roomId).pipe(
            catchError((err) => {
              this.router.navigate(['lobby']);
              throw err;
            }),
          );
        }
        return of('');
      }),
    ).subscribe();
  }

  hasControls(): boolean {
    return !!this.roomService.isHost;
  }

  loadFile(): void {
    this.fileService.loadFile('.mp4').pipe(
      switchMap((blob) => this.roomService.createRoom('User' + Math.random().toFixed(4).toString().substring(2)).pipe(map((id) => ({id, blob})))),
    ).subscribe(({id, blob}) => {
      const movie = {
        id: id,
        hash: '',
        mime_type: blob.type,
        file_size: blob.size,
        title: 'temp',
        downloaded_length: blob.size,
        content_length: blob.size,
        corrupt: false,
      };
      this.storageService.putMovieWithBlob(movie, blob);
      this.roomService.roomState.pipe(first()).subscribe((roomState) => {
        if (!roomState) return;
        roomState.movie = movie;
        this.roomService.setRoomState(roomState);
      });
      this.router.navigate(['lobby', id]);
    });
  }
}
