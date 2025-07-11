import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

/**
 * Componente de la página de inicio principal de TeamLens
 * 
 * Esta landing page está específicamente diseñada para profesores y educadores,
 * proporcionando una experiencia profesional que refleja la calidad y propósito
 * de la plataforma de formación inteligente de equipos.
 * 
 * Características principales:
 * - Hero section con propuesta de valor clara
 * - Sección de características y beneficios
 * - Testimonios de usuarios reales
 * - Call-to-action optimizado para conversión
 * - Diseño responsive y accesible
 * 
 * @autor Equipo de Desarrollo TeamLens
 * @version 2.0.0
 */
@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterModule, CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {

  /**
   * Constructor del componente
   * Inicializa la página de inicio con configuración optimizada para SEO
   */
  constructor() {
    // Configuración inicial para mejores prácticas de SEO
    this.setupSEOMetadata();
  }

  /**
   * Configura metadatos SEO para optimizar el posicionamiento
   * y la experiencia del usuario en motores de búsqueda
   * 
   * @private
   */
  private setupSEOMetadata(): void {
    // En un entorno de producción, aquí se configurarían
    // los metadatos específicos para SEO y social media
    if (typeof document !== 'undefined') {
      document.title = 'TeamLens - Plataforma Inteligente de Formación de Equipos para Profesores';
    }
  }

  /**
   * Método para tracking de eventos de conversión
   * Utilizado para analizar el comportamiento del usuario
   * 
   * @param action - Acción realizada por el usuario
   * @param category - Categoría del evento
   */
  trackUserAction(action: string, category: string = 'Landing Page'): void {
    // Implementación de analytics para tracking de conversiones
    // En producción, esto se integraría con Google Analytics o similar
    console.log(`Evento tracked: ${category} - ${action}`);
  }

}
