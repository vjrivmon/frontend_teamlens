import { Injectable } from '@angular/core';
import { HttpEvent, HttpInterceptor, HttpHandler, HttpRequest, HTTP_INTERCEPTORS, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';


const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

@Injectable()
export class HttpRequestInterceptor implements HttpInterceptor {
  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    
    // Rutas que permiten acceso anónimo (sin credenciales)
    const isAnonymousRoute =
      req.url.includes('/submit-anonymous') ||  // Envío anónimo de cuestionarios
      (req.url.includes('/questionnaires/') && req.method === 'GET' &&
       !req.url.includes('/submit') &&
       !req.url.includes('/asked') &&  // /questionnaires/asked requiere autenticación
       !req.url.includes('/stats') &&  // /questionnaires/activity/.../stats requiere autenticación
       req.url.match(/\/questionnaires\/[a-f0-9]{24}$/)); // Solo GET directo de cuestionario por ID
    
    // Configurar petición según el tipo de ruta
    if (isAnonymousRoute) {
      // Para rutas anónimas: solo headers, sin credenciales
      req = req.clone({
        setHeaders: {
          'Content-Type': 'application/json'
        }
        // NO incluir withCredentials para permitir acceso anónimo
      });
      
      console.log('🔓 [HttpInterceptor] Permitiendo acceso anónimo a:', req.url);
    } else {
      // Para rutas autenticadas: incluir credenciales
      req = req.clone({
        withCredentials: true,
        ...httpOptions
      });
      
      console.log('🔐 [HttpInterceptor] Requiriendo autenticación para:', req.url);
    }
    
    return next.handle(req);
  }
}

export const httpInterceptorProviders = [
  { provide: HTTP_INTERCEPTORS, useClass: HttpRequestInterceptor, multi: true },
];

