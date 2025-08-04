import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http'; // Added import

import { AppComponent } from './app.component';
import { VideoPlayerComponent } from './video-player/video-player.component';

@NgModule({
  declarations: [
    AppComponent,
    VideoPlayerComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }