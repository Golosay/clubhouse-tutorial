import { Component } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/auth';
import { Router } from '@angular/router';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent {

  constructor(private auth: AngularFireAuth, private route: Router) { }

  public login(): void {
    this.auth.signInAnonymously().then(() => {
      this.route.navigate(['rooms']);
    });
  }
}
