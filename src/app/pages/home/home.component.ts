import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { fromEvent, of, switchMap } from 'rxjs';
import { FileService } from 'src/app/shared/file/file.service';
import { MediaService } from 'src/app/shared/media/media.service';
import { RoomService } from 'src/app/shared/room/room.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, AfterViewInit {

  @ViewChild('video')
  video?: ElementRef;

  constructor(
    private roomService: RoomService,
    private fileService: FileService,
    private mediaService: MediaService,
    private route: ActivatedRoute,
    private router: Router,
  ) {
  }


  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const roomId = params.get('id');
      if (roomId && !this.roomService.isHost) {
        this.roomService.joinRoom(roomId, this.mediaService.createMediaStreamFake()).subscribe((stream) => {
          this.video!.nativeElement.srcObject = stream;
          this.video!.nativeElement.play();
        });
      }
    });
  }

  ngAfterViewInit(): void {
    fromEvent(this.video?.nativeElement, 'loadedmetadata').pipe(
      switchMap(() => {
        if (this.roomService.isHost) {
          return this.roomService.createRoom(this.mediaService.createStream(this.video?.nativeElement));
        }
        return of(this.roomService.roomId);
      })
    ).subscribe((id) => {
      if (this.roomService.isHost) {
        this.router.navigate(['/lobby', id]);
      }
    });
  }

  hasControls(): boolean {
    return !!this.roomService.isHost;
  }

  loadFile(): void {
    this.fileService.loadFile('.mp4').subscribe((src) => {
      this.roomService.isHost = true;
      this.video!.nativeElement.src = URL.createObjectURL(src);
    });
  }
}
