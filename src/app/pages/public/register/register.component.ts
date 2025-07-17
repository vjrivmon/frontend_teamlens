import { Component } from '@angular/core';
import { RegisterFormComponent } from '../components/register-form/register-form.component';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

/**
 * Componente de Registro de Usuarios
 * Maneja tanto registro de profesores como estudiantes invitados
 * 
 * @author TeamLens Frontend Team
 * @version 2.0.0 - Corregido manejo de invitationToken desde URL
 */
@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    RegisterFormComponent
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  
  /**
   * Token de invitación extraído de la URL
   * Undefined para registros de profesores, string para estudiantes invitados
   */
  invitationToken: string | undefined;

  constructor(
    private authService: AuthService, 
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    // 🔧 CRÍTICO: Obtener invitationToken desde los parámetros de la ruta
    this.route.params.subscribe(params => {
      this.invitationToken = params['invitationToken'];
      
      if (this.invitationToken) {
        console.log(`🎫 [RegisterComponent] Token de invitación recibido: ${this.invitationToken.substring(0, 10)}...`);
      } else {
        console.log(`👨‍🏫 [RegisterComponent] Registro de profesor (sin token de invitación)`);
      }
    });

    // Verificar si el usuario ya está logueado
    this.authService.isLoggedIn.subscribe(
      isLoggedIn => {
        if (isLoggedIn) {
          console.log(`🔄 [RegisterComponent] Usuario ya autenticado, redirigiendo al dashboard`);
          this.router.navigateByUrl('/dashboard');
        }
      }
    );
  }
}
