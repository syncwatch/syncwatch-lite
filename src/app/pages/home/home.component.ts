import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
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

  roomId: string = '';

  @ViewChild('video')
  video?: ElementRef;

  constructor(
    private roomService: RoomService,
    private fileService: FileService,
    private mediaService: MediaService,
  ) { }


  ngOnInit(): void {
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
      if (this.roomService.isHost) console.log(id)
    });
  }

  hasControls(): boolean {
    return this.roomService.isHost;
  }

  call(): void {
    this.roomService.joinRoom('', this.roomId, this.mediaService.createMediaStreamFake()).subscribe((stream) => {
      this.video!.nativeElement.srcObject = stream;
      this.video!.nativeElement.play();
    });
  }

  loadFile(): void {
    this.fileService.loadFile('.mp4').subscribe((src) => {
      this.video!.nativeElement.src = URL.createObjectURL(src);
    });
  }
}
