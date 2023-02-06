import { Injectable } from '@angular/core';

@Injectable()
export class MediaService {
  constructor() { }

  getUserMedia = (<any>navigator).getUserMedia || (<any>navigator).webkitGetUserMedia || (<any>navigator).mozGetUserMedia;

  createStream(media: { captureStream?: any, mozCaptureStream?: any }): MediaStream {
    if (media.captureStream) {
      return media.captureStream();
    }
    if (media.mozCaptureStream) {
      return media.mozCaptureStream();
    }
    throw new Error('capture stream not supported');
  }

  createMediaStreamFake(): MediaStream {
    return new MediaStream([this.createEmptyAudioTrack(), this.createEmptyVideoTrack(1, 1)]);
  }

  createEmptyAudioTrack() {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const dst = oscillator.connect(ctx.createMediaStreamDestination());
    oscillator.start();
    const track = (<any>dst).stream.getAudioTracks()[0];
    return Object.assign(track, { enabled: false });
  }

  createEmptyVideoTrack(width: number, height: number) {
    const canvas = Object.assign(document.createElement('canvas'), { width, height });
    canvas.getContext('2d')!.fillRect(0, 0, width, height);

    const stream = canvas.captureStream();
    const track = stream.getVideoTracks()[0];

    return Object.assign(track, { enabled: false });
  }
}
