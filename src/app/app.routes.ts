// app.routes.ts
import { Routes } from '@angular/router';
import { HomeComponent } from '@app/pages/home/home';
import { newRequest } from '@app/pages/new/new';

import { Landing } from '@app/pages/landing/landing';
export const routes: Routes = [
  {
    path: '',
    component: HomeComponent,
    title: 'Wallo | Install',
    data: { description: 'Solicita reparaciones a domicilio: plomería, electricidad, pintura y más.', canonical: '/' },
  },
  { path: 'landing', loadComponent: () => import('./pages/landing/landing').then(c => c.Landing) },
  { path: 'requests', loadComponent: () => import('./pages/requests/requests').then(c => c.Requests) },
  { path: 'request-detail/:id', loadComponent: () => import('./pages/request-detail/request-detail').then(c => c.RequestDetail) },
  { path: 'register', loadComponent: () => import('./pages/register/register').then(c => c.Register) },
  { path: 'new', loadComponent: () => import('./pages/new/new').then(c => c.newRequest) },
  { path: 'login', loadComponent: () => import('./pages/login/login').then(c => c.Login) },

  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile').then(c => c.Profile),
    children: [
      { path: 'biografy',   outlet: 'panel', loadComponent: () => import('./pages/profile/sections/expert/biografy/biografy.component').then(c => c.BiografyComponent) },
      { path: 'services',   outlet: 'panel', loadComponent: () => import('./pages/profile/sections/expert/services/services').then(c => c.Services) },
      { path: 'documents',  outlet: 'panel', loadComponent: () => import('./pages/profile/sections/expert/documents/documents').then(c => c.Documents) },
      { path: 'gallery',    outlet: 'panel', loadComponent: () => import('./pages/profile/sections/expert/gallery/gallery').then(c => c.GalleryComponent) },
      { path: 'add-gallery',outlet: 'panel', loadComponent: () => import('./pages/profile/sections/expert/add-gallery/add-gallery').then(c => c.AddGallery) },
      {
        path: 'payment',
        outlet: 'panel',
        loadComponent: () =>
          import('./pages/profile/sections/expert/payment/payment')
            .then(c => c.PaymentComponent)
      },
      {
        path: 'suscription-plan',
        outlet: 'panel',
        loadComponent: () =>
          import('./pages/profile/sections/expert/suscription-plan/suscription-plan')
            .then(c => c.SuscriptionPlan)
      },
      {
        path: 'wallet',
        outlet: 'panel',
        loadComponent: () =>
          import('./pages/profile/sections/expert/wallet/wallet')
            .then(c => c.Wallet)
      },
      {
        path: 'emergency-info',
        outlet: 'panel',
        loadComponent: () =>
          import('./pages/profile/sections/expert/emergency-info/emergency-info')
            .then(c => c.EmergencyInfo)
      },
      { path: 'address',    outlet: 'panel', loadComponent: () => import('./pages/profile/sections/client/address/address').then(c => c.Address) },
      { path: 'reviews',    outlet: 'panel', loadComponent: () => import('./pages/profile/sections/client/reviews/reviews').then(c => c.Reviews) },
      { path: 'client-biografy',   outlet: 'panel', loadComponent: () => import('./pages/profile/sections/client/biografy/biografy').then(c => c.BiografyComponent) },
    ],
  },

  { path: 'notifications', loadComponent: () => import('./pages/notifications/notifications').then(c => c.Notifications) },
  { path: 'servicios',     loadComponent: () => import('./pages/services/services').then(c => c.Services) },
  { path: 'servicio/:slug',loadComponent: () => import('@app/pages/service-detail/service-detail').then(c => c.ServiceDetail) },
  { path: 'expert/:id',    loadComponent: () => import('./pages/expert/expert').then(c => c.Expert) },
  { path: 'expert',        loadComponent: () => import('./pages/expert/expert').then(c => c.Expert) },
  { path: 'expertDetail/:id', loadComponent: () => import('./pages/expert-detail/expert-detail').then(c => c.ExpertDetail) },
  { path: 'booking', loadComponent: () => import('./pages/booking/booking').then(c => c.Booking) },
  { path: '**', redirectTo: '' },
];
