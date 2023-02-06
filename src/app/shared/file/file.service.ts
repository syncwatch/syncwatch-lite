import { Injectable } from '@angular/core';
import { finalize, first, fromEvent, map, Observable, of, switchMap } from 'rxjs';

@Injectable()
export class FileService {

  constructor() { }

  saveFile(filename: string, blob: Blob): void {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }

  loadFile(accept: string): Observable<Blob> {
    const input = document.createElement('input');
    input.type = 'file';
    input.style.display = 'none';
    input.accept = accept;

    document.body.appendChild(input);

    let obs = fromEvent(input, 'change').pipe(
      first(),
      finalize(() => document.body.removeChild(input)),
      map(() => {
        if (!input.files || input.files.length == 0) {
          throw Error('something went wrong');
        }
        return input.files[0];
      }),
    );

    input.click();
    return obs;
  }

  saveTextFile(filename: string, content: string): void {
    return this.saveFile(filename, new Blob([content], {type: 'text/plain'}));
  }

  loadTextFile(accept: string): Observable<string> {
    return this.loadFile(accept).pipe(
      switchMap((blob) => {
        if (blob.size > 250000000 || !FileReader) {
          throw new Error('something went wrong');
        }
        const fileReader = new FileReader();
        let obs = fromEvent(fileReader, 'load').pipe(
          first(),
          switchMap((event) => {
            let e: any = event;
            if (!e.target || !e.target.result) {
              throw new Error('something went wrong');
            }
            let content: string;
            if (typeof e.target.result === 'string') {
                content = e.target.result;
            } else {
                content = new TextDecoder().decode(e.target.result);
            }
            return content;
          }),
        )
        fileReader.readAsText(blob);
        return obs;
      }),
    )
  }

}
