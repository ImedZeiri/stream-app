import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface StreamData {
  scoreUrl: string;
  NowPlaying: boolean;
  streamingUrl: string;
  link: string;
  Channel: string;
  isStatic: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class StreamService {
  getStreams(): Observable<StreamData> {
    const fakeData: StreamData = {
      scoreUrl: '',
      NowPlaying: true,
      streamingUrl:
        'https://e765432.xyz/static/dfc5b4a8b3793cb1176ab4a56dfb3e896ed419aa/getdata.php?chid=7112&ip=197.3.35.24',
      link: 'https://11gref-1en.com/7112/index.m3u8',
      Channel: '7112',
      isStatic: false,
    };

    return of(fakeData);
  }
}
