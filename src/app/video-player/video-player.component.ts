import {
  Component,
  Input,
  OnInit,
  OnDestroy,
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
export class VideoPlayerComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() stream!: StreamData;
  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;

  usingFallback: boolean = false;
  staticUrl = 'https://1875.space/pad=999/7104/mono.m3u8';
  isLive: boolean = true;
  streamStartTime: Date = new Date();
  currentTime: string = '00:00';
  
  private hls: Hls | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private bufferCheckInterval: any;
  
  bufferConfig = {
    maxBufferLength: 60,
    maxMaxBufferLength: 120,
    liveSyncDurationCount: 2,
    liveMaxLatencyDurationCount: 6,
    maxBufferHole: 0.5,
    manifestLoadingTimeOut: 10000,
    manifestLoadingMaxRetry: 6,
    levelLoadingTimeOut: 10000,
    levelLoadingMaxRetry: 6,
    fragLoadingTimeOut: 20000,
    fragLoadingMaxRetry: 6
  };
  ngOnInit() {
    this.updateStreamTimer();
  }

  ngAfterViewInit() {
    if (this.stream) {
      this.setupVideo();
    }
  }

  setupVideo() {
    const video = this.videoPlayer.nativeElement;
    const url = this.staticUrl;

    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    
    if (Hls.isSupported()) {
      this.initializeHls(video, url);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = url;
      video.play().catch(() => this.handlePlaybackError());
    } else {
      this.onVideoError();
    }
    
    this.startBufferMonitoring();
  }

  private initializeHls(video: HTMLVideoElement, url: string) {
    if (this.hls) {
      this.hls.destroy();
    }

    this.hls = new Hls({
      ...this.bufferConfig,
      enableWorker: true,
      lowLatencyMode: true,
      backBufferLength: 30,
      progressive: false,
      startFragPrefetch: true
    });

    this.hls.loadSource(url);
    this.hls.attachMedia(video);
    
    this.setupHlsEventHandlers(video);
  }

  private setupHlsEventHandlers(video: HTMLVideoElement) {
    if (!this.hls) return;

    this.hls.on(Hls.Events.MANIFEST_LOADED, () => {
      this.reconnectAttempts = 0;
      video.play().catch(() => this.handlePlaybackError());
    });

    this.hls.on(Hls.Events.ERROR, (event, data) => {
      this.handleHlsError(data, video);
    });

    this.hls.on(Hls.Events.BUFFER_APPENDED, () => {
      if (video.paused && video.readyState >= 3) {
        video.play().catch(() => this.handlePlaybackError());
      }
    });
  }

  private handleHlsError(data: any, video: HTMLVideoElement) {
    if (data.fatal) {
      switch (data.type) {
        case Hls.ErrorTypes.NETWORK_ERROR:
          this.handleNetworkError();
          break;
        case Hls.ErrorTypes.MEDIA_ERROR:
          this.handleMediaError();
          break;
        default:
          this.reconnectStream();
          break;
      }
    }
  }

  private handleNetworkError() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.hls?.startLoad();
        this.reconnectAttempts++;
      }, this.reconnectDelay * Math.pow(2, this.reconnectAttempts));
    } else {
      this.reconnectStream();
    }
  }

  private handleMediaError() {
    this.hls?.recoverMediaError();
  }

  private reconnectStream() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      setTimeout(() => {
        this.setupVideo();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  private handlePlaybackError() {
    const video = this.videoPlayer.nativeElement;
    if (video.error) {
      this.reconnectStream();
    }
  }

  private startBufferMonitoring() {
    this.bufferCheckInterval = setInterval(() => {
      const video = this.videoPlayer.nativeElement;
      if (video && video.buffered.length > 0) {
        const bufferEnd = video.buffered.end(video.buffered.length - 1);
        const currentTime = video.currentTime;
        const bufferHealth = bufferEnd - currentTime;
        
        if (bufferHealth < 2 && !video.paused) {
          this.adjustBufferSettings(true);
        } else if (bufferHealth > 10) {
          this.adjustBufferSettings(false);
        }
        
        if (video.paused && bufferHealth > 3) {
          video.play().catch(() => this.handlePlaybackError());
        }
      }
    }, 1000);
  }

  private adjustBufferSettings(increase: boolean) {
    if (!this.hls) return;
    
    if (increase) {
      this.bufferConfig.maxBufferLength = Math.min(120, this.bufferConfig.maxBufferLength + 10);
    } else {
      this.bufferConfig.maxBufferLength = Math.max(30, this.bufferConfig.maxBufferLength - 5);
    }
  }

  onVideoError() {
    if (!this.usingFallback && this.stream.link) {
      this.usingFallback = true;
      this.setupVideo();
    } else {
      this.reconnectStream();
    }
  }

  ngOnDestroy() {
    if (this.hls) {
      this.hls.destroy();
    }
    if (this.bufferCheckInterval) {
      clearInterval(this.bufferCheckInterval);
    }
  }

  updateStreamTimer() {
    setInterval(() => {
      const now = new Date();
      const diff = now.getTime() - this.streamStartTime.getTime();
      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      this.currentTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
  }


}
