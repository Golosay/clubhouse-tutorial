import {
  Component,
  ElementRef,
  Inject,
  OnDestroy,
  OnInit,
  ViewChild
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import AgoraRTC from 'agora-rtc-sdk';
import { environment } from 'src/environments/environment';
import { AngularFireAuth } from '@angular/fire/auth';
import { take } from 'rxjs/operators';
import { AngularFireDatabase } from '@angular/fire/database';
import { Iroom } from '../rooms.component';
import { PresenceService } from 'src/app/services/presence.service';
import { combineLatest } from 'rxjs';

const randomNames = [
  'Sheryl Edie',
  'Dalton Kincade',
  'Nathan Laber',
  'Carola Wilmot'
];

@Component({
  selector: 'app-room',
  templateUrl: './room.component.html',
  styleUrls: ['./room.component.scss']
})
export class RoomComponent implements OnInit, OnDestroy {
  @ViewChild('streamContainer', { static: true })
  public streamContainer: ElementRef;
  public $onlineList: any;
  public isHost = false;
  public room: Iroom;
  private client: AgoraRTC.Client;
  private roomId: string | null;
  private user: any;

  private localStreams = [];
  private localStream: AgoraRTC.Stream;
  private streamOptions = {
    audio: true,
    video: false,
    streamID: null,
    screen: false
  };
  constructor(
    private activatedRoute: ActivatedRoute,
    private route: Router,
    private auth: AngularFireAuth,
    private db: AngularFireDatabase,
    private presenceService: PresenceService,
    @Inject(DOCUMENT) private document: HTMLDocument
  ) {}

  ngOnInit(): void {
    this.roomId = this.activatedRoute.snapshot.paramMap.get('id');
    this.initClient();
    this.joinRoom();
    this.subscribeToStreamStart();
    this.subscribeToStreamStop();
    this.$onlineList = this.db.list(`online/${this.roomId}`).valueChanges();
  }

  ngOnDestroy(): void {
    this.presenceService.setPresenceOffline(
      { key: this.user.uid },
      this.roomId
    );
    this.client.leave();
  }

  public leaveRoom(): void {
    if (this.localStream) {
      this.localStream.stop();
      this.localStream.close();
    }
    this.route.navigate(['/rooms']);
  }

  private initClient(): void {
    this.client = AgoraRTC.createClient({
      mode: 'live',
      codec: 'vp8'
    });

    this.client.init(environment.agoraAppId);
  }

  private joinRoom(): void {
    combineLatest([
      this.auth.authState,
      this.db.object<Iroom>(`rooms/${this.roomId}`).valueChanges()
    ])
      .pipe(take(1))
      .subscribe({
        next: ([user, room]) => {
          this.user = user;
          this.room = room;
          this.isHost = this.user.uid === this.room.host;
          this.client.setClientRole(this.isHost ? 'host' : 'audience');
          this.joinStream();
          this.presenceService
            .setPresenceOnline(
              {
                displayName:
                  randomNames[Math.floor(Math.random() * randomNames.length)],
                key: this.user.uid
              },
              this.roomId
            )
            .subscribe();
        }
      });
  }
  private joinStream(): void {
    this.streamOptions.streamID = this.roomId;
    this.client.join(
      'user_token_generated_on_the_back_end',
      'demo',
      null,
      null,
      (uid) => {
        // Create a local stream
        this.localStreams.push(uid);
        if (this.isHost) {
          this.createLocalStream();
        }
      },
      this.handleError
    );
  }

  private addStream(elementId): void {
    // Creates a new div for every stream
    const streamDiv = document.createElement('div');
    streamDiv.id = elementId;
    this.streamContainer.nativeElement.appendChild(streamDiv);
  }

  private removeStream(elementId: string): void {
    const remoteDiv = document.getElementById(elementId);
    if (remoteDiv) {
      remoteDiv?.parentNode?.removeChild(remoteDiv);
    }
  }

  private createLocalStream(): void {
    this.localStream = AgoraRTC.createStream(this.streamOptions);
    // Initialize the local stream
    this.localStream.init(() => {
      this.client.publish(this.localStream, this.handleError);
    }, this.handleError);
  }

  private handleError(err: any): void {
    console.error(err);
  }

  private subscribeToStreamStart(): void {
    this.client.on('stream-added', (evt) => {
      if (!this.localStreams.includes(evt.stream.getId())) {
        this.client.subscribe(evt.stream, null, this.handleError);
      }
    });
    // Play the remote stream when it is subsribed
    this.client.on('stream-subscribed', (evt) => {
      const stream = evt.stream;
      const streamId = String(stream.getId());
      this.addStream(streamId);
      stream.play(streamId);
    });
  }

  private subscribeToStreamStop(): void {
    // Remove the corresponding view when a remote user unpublishes.
    this.client.on('stream-removed', (evt) => {
      const stream = evt.stream;
      const streamId = String(stream.getId());
      stream.close();
      this.removeStream(streamId);
    });
    // Remove the corresponding view when a remote user leaves the channel.
    this.client.on('peer-leave', (evt) => {
      const stream = (evt as any).stream;
      const streamId = String(stream.getId());
      stream.close();
      this.removeStream(streamId);
    });
  }
}
