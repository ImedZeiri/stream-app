import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';

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
  constructor(private http: HttpClient) {}

  getStreams(): Observable<StreamData> {
    const fakeData: StreamData = {
      scoreUrl: '',
      NowPlaying: true,
      streamingUrl:
        'https://e765432.xyz/static/dfc5b4a8b3793cb1176ab4a56dfb3e896ed419aa/getdata.php?chid=7112&ip=197.3.35.24',
      link: 'https://1875.space/pad=999/7109/mono.m3u8',
      Channel: '7112',
      isStatic: false,
    };

    return of(fakeData);
  }

  getStreamLink(eventId: number): Observable<Response[]> {
    const url = `/api/list/listCasinoProduct?eventId=${eventId}`;
    return this.http.get<Response[]>(url);
  }  
}
