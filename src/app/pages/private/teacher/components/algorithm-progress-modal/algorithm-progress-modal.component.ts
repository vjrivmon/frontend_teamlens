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
   * OBSOLETO: Evento emitido cuando el usuario quiere cancelar el algoritmo
   * Ya no se usa - el algoritmo no se puede cancelar
   */
  @Output() onCancel = new EventEmitter<void>();

  constructor() {}

  /**
   * Obtiene el título del modal basado en el estado actual
   */
  getTitle(): string {
    if (!this.isCompleted) {
      return 'Ejecutando Algoritmo de Equipos';
    }
    return this.isSuccess ? '¡Equipos Creados Exitosamente!' : 'Error en la Creación de Equipos';
  }

  /**
   * Cierra el modal - solo disponible cuando el algoritmo ha terminado
   */
  closeModal(): void {
    this.onClose.emit();
  }

  /**
   * OBSOLETO: Cancela el algoritmo - Ya no se usa
   * El algoritmo ahora se ejecuta en segundo plano sin posibilidad de cancelación
   */
  cancelAlgorithm(): void {
    console.log('⚠️ Cancelación no permitida - el algoritmo se ejecuta en segundo plano');
    // No hacer nada - la cancelación está deshabilitada
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
} 