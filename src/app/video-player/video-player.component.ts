import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ElementRef,
  ViewChild,
  HostListener,
} from '@angular/core';
import Hls from 'hls.js';
import { StreamData } from '../stream.service';

@Component({
  selector: 'app-video-player',
  templateUrl: './video-player.component.html',
  styleUrls: ['./video-player.component.css']
})
export class VideoPlayerComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() streamUrl!: StreamData;
  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;

  // Player state
  isPlaying: boolean = false;
  isLoading: boolean = true;
  hasError: boolean = false;
  showControls: boolean = false;
  showVolumeSlider: boolean = false;
  isFullscreen: boolean = false;
  isLive: boolean = true;
  
  // Progress
  playProgress: number = 0;
  bufferProgress: number = 0;
  
  volume: number = 0;
  isMuted: boolean = true;
  
  currentTime: string = '00:00';
  streamStartTime: Date = new Date();
  
  private hls: Hls | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private controlsHideTimeout: any;
  private progressUpdateInterval: any;
  
  ngOnInit() {
    this.isLoading = true;
    this.updateStreamTimer();
  }

  ngAfterViewInit() {
    this.setupVideo();
    this.setupEventListeners();
    this.setVolume(0); // Initialiser avec son coupé
  }

  ngOnDestroy() {
    this.cleanup();
  }

  private setupVideo() {
    const video = this.videoPlayer.nativeElement;
    const url = this.streamUrl.link;

    video.setAttribute('playsinline', 'true');
    video.setAttribute('webkit-playsinline', 'true');
    
    if (Hls.isSupported()) {
      this.isLoading = false;
      this.setupHls(video, url);
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      this.setupNativeHls(video, url);
    } else {
      this.handleUnsupportedBrowser();
    }
  }

  private setupHls(video: HTMLVideoElement, url: string) {
    this.hls = new Hls({
      maxBufferLength: 30,
      maxMaxBufferLength: 60,
      liveSyncDurationCount: 3,
      liveMaxLatencyDurationCount: 6,
      enableWorker: true,
      lowLatencyMode: true,
    });

    this.hls.loadSource(url);
    this.hls.attachMedia(video);

    this.hls.on(Hls.Events.MANIFEST_LOADED, () => {
      this.isLoading = false;
      this.hasError = false;
      video.muted = true;
      video.play().catch(e => this.handlePlaybackError(e));
    });

    this.hls.on(Hls.Events.ERROR, (event, data) => {
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
    });

    this.hls.on(Hls.Events.FRAG_BUFFERED, () => {
      if (video.paused && video.readyState >= 3) {
        video.play().catch(e => this.handlePlaybackError(e));
      }
    });
  }

  private setupNativeHls(video: HTMLVideoElement, url: string) {
    video.src = url;
    video.addEventListener('loadedmetadata', () => {
      this.isLoading = false;
      this.hasError = false;
      video.muted = true;
      video.play().catch(e => this.handlePlaybackError(e));
    });
    
    video.addEventListener('error', () => {
      this.handlePlaybackError(new Error('Native HLS playback error'));
    });
  }

  private handleUnsupportedBrowser() {
    this.hasError = true;
    this.isLoading = false;
    console.error('HLS is not supported in this browser');
  }

  private setupEventListeners() {
    const video = this.videoPlayer.nativeElement;
    
    video.addEventListener('play', () => {
      this.isPlaying = true;
      this.startProgressUpdates();
    });
    
    video.addEventListener('pause', () => {
      this.isPlaying = false;
      this.stopProgressUpdates();
    });
    
    video.addEventListener('waiting', () => {
      this.isLoading = true;
    });
    
    video.addEventListener('playing', () => {
      this.isLoading = false;
    });
    
    video.addEventListener('volumechange', () => {
      this.volume = video.muted ? 0 : Math.round(video.volume * 100);
      this.isMuted = video.muted;
    });
  }

  private startProgressUpdates() {
    this.progressUpdateInterval = setInterval(() => {
      const video = this.videoPlayer.nativeElement;
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        const duration = Math.max(video.duration, bufferedEnd);
        this.bufferProgress = (bufferedEnd / duration) * 100;
        
        if (!this.isLive) {
          this.playProgress = (video.currentTime / duration) * 100;
        }
      }
    }, 500);
  }

  private stopProgressUpdates() {
    if (this.progressUpdateInterval) {
      clearInterval(this.progressUpdateInterval);
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

  reconnectStream() {
    this.isLoading = true;
    this.hasError = false;
    this.reconnectAttempts = 0;
    this.cleanup();
    this.setupVideo();
  }

  private handlePlaybackError(error: any) {
    console.error('Playback error:', error);
    this.isLoading = false;
    this.hasError = true;
    this.isPlaying = false;
  }

  togglePlay() {
    const video = this.videoPlayer.nativeElement;
    if (video.paused) {
      video.play().catch(e => this.handlePlaybackError(e));
    } else {
      video.pause();
    }
    this.resetControlsHideTimeout();
  }

  onVolumeIconClick() {
    this.showVolumeSlider = !this.showVolumeSlider;
    if (!this.showVolumeSlider) {
      this.toggleMute();
    }
    this.resetControlsHideTimeout();
  }

  toggleMute() {
    const video = this.videoPlayer.nativeElement;
    if (video.volume === 0 && !video.muted) {
      // Cas spécial où volume est à 0 mais pas muted
      video.volume = 1;
      video.muted = false;
    } else {
      video.muted = !video.muted;
    }
    // Mettre à jour l'état local
    this.isMuted = video.muted;
    this.volume = video.muted ? 0 : Math.round(video.volume * 100);
    this.resetControlsHideTimeout();
  }

  setVolume(value: number) {
    const video = this.videoPlayer.nativeElement;
    this.volume = value;
    video.volume = value / 100;
    // Si le volume est > 0, on désactive le mute
    if (value > 0) {
      video.muted = false;
      this.isMuted = false;
    } else {
      // Si volume = 0, on active le mute
      video.muted = true;
      this.isMuted = true;
    }
    this.resetControlsHideTimeout();
  }

  toggleVolumeSlider() {
    this.showVolumeSlider = !this.showVolumeSlider;
    this.resetControlsHideTimeout();
  }

  getVolumeIcon(): string {
    if (this.isMuted || this.volume === 0) return '🔇';
    if (this.volume < 50) return '🔉';
    return '🔊';
  }

  toggleFullscreen() {
    const videoContainer = this.videoPlayer.nativeElement.parentElement;
    if (!videoContainer) return;

    if (!document.fullscreenElement) {
      videoContainer.requestFullscreen().catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
    this.resetControlsHideTimeout();
  }

  updateStreamTimer() {
    setInterval(() => {
      const now = new Date();
      const diff = now.getTime() - this.streamStartTime.getTime();
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      
      if (hours > 0) {
        this.currentTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      } else {
        this.currentTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
    }, 1000);
  }

  private resetControlsHideTimeout() {
    if (this.controlsHideTimeout) {
      clearTimeout(this.controlsHideTimeout);
    }
    this.showControls = true;
    this.controlsHideTimeout = setTimeout(() => {
      this.showControls = false;
      this.showVolumeSlider = false;
    }, 3000);
  }

  @HostListener('document:keydown.space', ['$event'])
  handleSpaceKey(event: Event) {
    event.preventDefault();
    this.togglePlay();
  }

  @HostListener('document:keydown.f', ['$event'])
  handleFKey(event: Event) {
    event.preventDefault();
    this.toggleFullscreen();
  }

  @HostListener('document:keydown.m', ['$event'])
  handleMKey(event: Event) {
    event.preventDefault();
    this.toggleMute();
  }

  @HostListener('document:fullscreenchange')
  handleFullscreenChange() {
    this.isFullscreen = !!document.fullscreenElement;
  }

  private cleanup() {
    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }
    
    this.stopProgressUpdates();
    
    if (this.controlsHideTimeout) {
      clearTimeout(this.controlsHideTimeout);
    }
    
    const video = this.videoPlayer.nativeElement;
    video.pause();
    video.removeAttribute('src');
    video.load();
  }
}