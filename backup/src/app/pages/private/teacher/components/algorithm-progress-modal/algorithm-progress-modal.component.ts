import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

// Importaciones de PrimeNG necesarias para el modal
import { DialogModule } from 'primeng/dialog';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ButtonModule } from 'primeng/button';

/**
 * Modal dedicado para mostrar el progreso del algoritmo de formación de equipos
 * Separado del stepper principal para evitar conflictos de CSS y layout
 */
@Component({
  selector: 'app-algorithm-progress-modal',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    ProgressSpinnerModule,
    ButtonModule
  ],
  templateUrl: './algorithm-progress-modal.component.html',
  styleUrls: ['./algorithm-progress-modal.component.css']
})
export class AlgorithmProgressModalComponent {
  
  /**
   * Controla la visibilidad del modal
   */
  @Input() visible: boolean = false;
  
  /**
   * Mensaje de progreso actual del algoritmo
   */
  @Input() progressMessage: string = '';
  
  /**
   * Tiempo transcurrido en segundos
   */
  @Input() elapsedTime: number = 0;
  
  /**
   * Tiempo estimado restante
   */
  @Input() estimatedTimeRemaining: string = '';
  
  /**
   * Indica si el algoritmo ha terminado (exitoso o con error)
   */
  @Input() isCompleted: boolean = false;
  
  /**
   * Indica si el algoritmo terminó exitosamente
   */
  @Input() isSuccess: boolean = false;
  
  /**
   * Número de grupos creados (cuando es exitoso)
   */
  @Input() groupsCreated: number = 0;
  
  /**
   * Mensaje de error (cuando falla)
   */
  @Input() errorMessage: string = '';
  
  /**
   * Evento emitido cuando el usuario cierra el modal después de completar
   */
  @Output() onClose = new EventEmitter<void>();
  
  /**
   * Evento emitido cuando el usuario quiere cancelar el algoritmo (si está corriendo)
   */
  @Output() onCancel = new EventEmitter<void>();

  constructor() {}

  /**
   * Cierra el modal - solo disponible cuando el algoritmo ha terminado
   */
  closeModal(): void {
    if (this.isCompleted) {
      this.onClose.emit();
    }
  }

  /**
   * Cancela el algoritmo - solo disponible mientras está corriendo
   */
  cancelAlgorithm(): void {
    if (!this.isCompleted) {
      this.onCancel.emit();
    }
  }

  /**
   * Obtiene el icono apropiado según el estado
   */
  getStatusIcon(): string {
    if (!this.isCompleted) {
      return 'pi pi-spin pi-spinner';
    }
    return this.isSuccess ? 'pi pi-check-circle' : 'pi pi-times-circle';
  }

  /**
   * Obtiene la clase CSS apropiada según el estado
   */
  getStatusClass(): string {
    if (!this.isCompleted) {
      return 'text-blue-600';
    }
    return this.isSuccess ? 'text-green-600' : 'text-red-600';
  }

  /**
   * Obtiene el título apropiado según el estado
   */
  getTitle(): string {
    if (!this.isCompleted) {
      return '🤖 Algoritmo en Ejecución';
    }
    return this.isSuccess ? '🎉 ¡Grupos Creados Exitosamente!' : '❌ Error en el Algoritmo';
  }
} 