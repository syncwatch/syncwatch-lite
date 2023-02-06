import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HomeComponent } from './pages/home/home.component';
import { FileService } from './shared/file/file.service';
import { MediaService } from './shared/media/media.service';
import { RoomService } from './shared/room/room.service';
import { ServiceWorkerModule } from '@angular/service-worker';
import { serviceWorkerConfig } from './shared/service/service.worker.config';
import { StorageService } from './shared/storage/storage.service';
import { BypassSanitizePipe } from './shared/pipes/bypass-sanitize.pipe';

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    BypassSanitizePipe,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ServiceWorkerModule.register(serviceWorkerConfig.serviceWorkerUrl, {
      enabled: serviceWorkerConfig.enabled,
      // Register the ServiceWorker as soon as the application is stable
      // or after 30 seconds (whichever comes first).
      // registrationStrategy: 'registerWhenStable:30000',
      registrationStrategy: 'registerImmediately',
  }),
  ],
  providers: [
    FileService,
    MediaService,
    RoomService,
    StorageService,
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
