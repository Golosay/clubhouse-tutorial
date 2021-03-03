import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RoomComponent } from './room/room.component';
import { RoomsComponent } from './rooms.component';

const routes: Routes = [
  { path: '', component: RoomsComponent },
  { path: ':id', component: RoomComponent }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class RoomsRoutingModule {}
