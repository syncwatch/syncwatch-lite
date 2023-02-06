import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';

const routes: Routes = [
  {component: HomeComponent, path: 'lobby'},
  {component: HomeComponent, path: 'lobby/:id'},
  {pathMatch: 'full', path: '', redirectTo: '/lobby'}
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {useHash: true})],
  exports: [RouterModule]
})
export class AppRoutingModule { }
