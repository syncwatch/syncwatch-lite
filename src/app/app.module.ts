import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './pages/home/home.component';
import { FileService } from './shared/file/file.service';
import { MediaService } from './shared/media/media.service';
import { RoomService } from './shared/room/room.service';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
  ],
  providers: [
    FileService,
    MediaService,
    RoomService,
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
