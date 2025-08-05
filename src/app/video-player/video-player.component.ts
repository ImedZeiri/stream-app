import {
  Component,
  Input,
  OnInit,
  AfterViewInit,
  ElementRef,
  ViewChild,
} from '@angular/core';
import { StreamData } from '../stream.service';
import Hls from 'hls.js';

@Component({
  selector: 'app-video-player',
  templateUrl: './video-player.component.html',
  styleUrls: ['./video-player.component.css'],
})
export class VideoPlayerComponent implements OnInit, AfterViewInit {
  @Input() stream!: StreamData;
  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;

  usingFallback: boolean = false;
  staticUrl = 'https://1875.space/pad=999/350/mono.m3u8';
  ngOnInit() {
  }

  ngAfterViewInit() {
    if (this.stream) {
      this.setupVideo();
    }
  }

  setupVideo() {
    const video = this.videoPlayer.nativeElement;
    const url = this.staticUrl;

    if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, () => this.onVideoError());
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
    } else {
      this.onVideoError();
    }
  }

  onVideoError() {
    if (!this.usingFallback && this.stream.link) {
      this.usingFallback = true;
      this.setupVideo();
    }
  }
}
