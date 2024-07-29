import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';

import { routes } from './app.routes';

import { httpInterceptorProviders } from './interceptors/http.interceptor';
import { HttpClientModule } from '@angular/common/http';

import { AuthService } from './services/auth.service';
import { ActivitiesService } from './services/activities.service';

import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { ConfirmationService, MessageService } from 'primeng/api';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes, withComponentInputBinding()),
    httpInterceptorProviders,
    importProvidersFrom(HttpClientModule),
    AuthService,
    ActivitiesService,
    importProvidersFrom(BrowserModule, BrowserAnimationsModule),
    ConfirmationService,
    MessageService    
  ]
};
