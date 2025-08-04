import { Component, OnInit } from '@angular/core';
import { StreamService, StreamData } from './stream.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  title = 'stream-app';
  stream: StreamData | null = null;

  constructor(private streamService: StreamService) {}

  ngOnInit() {
    this.streamService.getStreams().subscribe(data => {
      this.stream = data;
    });
  }
}
