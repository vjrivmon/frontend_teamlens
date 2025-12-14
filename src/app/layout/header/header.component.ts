import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';

// PrimeNG imports
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';

// Directivas personalizadas
import { StudentOnlyDirective } from '../../directives/student-only';
import { TeacherOnlyDirective } from '../../directives/teacher-only';

// Servicios
import { AuthService } from '../../services/auth.service';
import { WebSocketService } from '../../services/websocket.service';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    DialogModule,
    ButtonModule,
    StudentOnlyDirective,
    TeacherOnlyDirective
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit {

  // Servicios inyectados
  public authService = inject(AuthService);
  private router = inject(Router);
  private webSocketService = inject(WebSocketService); // Inicializa WebSocket globalmente

  // Estado del diálogo de logout
  public showLogoutDialog = false;

  /**
   * Observable que indica si el usuario está logueado
   */
  public get isLoggedIn$(): Observable<boolean> {
    return this.authService.isLoggedIn;
  }

  /**
   * Obtiene el nombre del usuario logueado
   */
  public getUserName(): string {
    const user = this.authService.getUser();
    return user?.name || 'Usuario';
  }

  /**
   * Obtiene el email del usuario logueado
   */
  public getUserEmail(): string {
    const user = this.authService.getUser();
    return user?.email || '';
  }

  ngOnInit(): void {
    console.log('🚀 HeaderComponent inicializado');
  }

  /**
   * Confirma y ejecuta el logout del usuario
   */
  public confirmLogout(): void {
    console.log('✅ HeaderComponent: Logout confirmado - cerrando sesión');
    
    // Cerrar el diálogo
    this.showLogoutDialog = false;
    
    // Ejecutar logout
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }
}
