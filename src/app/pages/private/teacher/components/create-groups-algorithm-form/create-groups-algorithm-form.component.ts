import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FormBuilder, Validators } from '@angular/forms';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { StepperModule } from 'primeng/stepper';
import { DropdownModule } from 'primeng/dropdown';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';

import { IUser, IQuestionnaire } from '../../../../../models/models';
import { ActivitiesService } from '../../../../../services/activities.service';

import BelbinAlgorithmData from '../../../../../models/algorithm-data';

/**
 * Interfaz para configuración de un tipo de grupo con rango flexible
 */
interface GroupConfiguration {
  minQuantity: number;    // Número mínimo de grupos de este tipo
  maxQuantity: number;    // Número máximo de grupos de este tipo
  size: number;           // Tamaño de cada grupo
  id?: string;            // ID único para el tracking
}

/**
 * Interfaz para restricciones de grupos
 */
interface IRestrictions {
  mustBeTogether: IUser[][];
  mustNotBeTogether: IUser[][];
  mustBeAGroup: IUser[][];
}

/**
 * Interfaz para vista previa de grupos
 */
interface GroupPreview {
  name: string;
  size: number;
  color: string;
}

@Component({
  selector: 'app-create-groups-algorithm-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ButtonModule, InputTextModule, InputNumberModule, InputTextareaModule, StepperModule, DropdownModule, TableModule, TagModule],
  templateUrl: './create-groups-algorithm-form.component.html',
  styleUrl: './create-groups-algorithm-form.component.css'
})
export class CreateGroupsAlgorithmFormComponent {

  //@Output() onCreated = new EventEmitter<bool>();

  @Input('activity') activityId: string = "";
  @Input('students') students: IUser[] = [];

  @Output() onRequestSent = new EventEmitter<boolean>();

  questionnaires = [{
    id: 1,
    title: 'BELBIN'
  },
    // {
    //   id: 2,
    //   title: 'MBTI'
    // }
  ]

  // Formulario simplificado - solo el algoritmo, sin límites fijos
  teamBuilderForm = this.formBuilder.group({
    algorithm: [this.questionnaires[0] || {} as IQuestionnaire, [Validators.required]]
  })

  selectedStudents: IUser[] = [];
  
  searchValue: string | undefined;
  searchValueRestricctions: string | undefined;
  selectedRestrictionStudents: IUser[] = [];
  
  restrictions: IRestrictions = {
    mustBeTogether: [],
    mustNotBeTogether: [],
    mustBeAGroup: []
  };

  active: number = 0;

  // Configuraciones de grupos múltiples con rangos flexibles
  groupConfigurations: GroupConfiguration[] = [];
  
  // Colores para la vista previa
  private readonly groupColors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', 
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];
  
  constructor(private formBuilder: FormBuilder, private activityService: ActivitiesService) { 
    // Inicializar con una configuración básica basada en estudiantes disponibles
    // Se actualizará dinámicamente cuando cambien los estudiantes seleccionados
  }

  /**
   * Se ejecuta cuando cambian los estudiantes seleccionados
   * Actualiza automáticamente las configuraciones existentes
   */
  onStudentsChange(): void {
    console.log('👥 Estudiantes seleccionados cambiaron:', this.selectedStudents.length);
    
    // Actualizar configuraciones existentes para que sean coherentes
    this.updateGroupConfiguration();
    
    // Si no hay configuraciones y hay estudiantes, sugerir una configuración inicial
    if (this.groupConfigurations.length === 0 && this.selectedStudents.length >= 4) {
      this.addGroupConfiguration();
    }
  }

  createRestriction(restrictionType: keyof IRestrictions) {

    // if (this.selectedRestrictionStudents.length < 2) {
    //   alert("You must select at least 2 students to create a restriction")
    //   return;
    // }

    // Check if the restriction is valid and makes sense with another ones
    const conflict = this.hasConflict(this.restrictions, this.selectedRestrictionStudents, restrictionType as 'mustBeTogether' | 'mustNotBeTogether') //todo: enum

    if (conflict) {
      alert("This restriction conflicts with another one")
      return;
    }

    this.restrictions[restrictionType].push(this.selectedRestrictionStudents);
    this.selectedRestrictionStudents = [];
  }

  removeRestriction(restrictionType: keyof IRestrictions, restrictionIndex: number) {
    this.restrictions[restrictionType].splice(restrictionIndex, 1);
  }



  hasConflict(restrictions: IRestrictions, newUsers: IUser[], type: 'mustBeTogether' | 'mustNotBeTogether'): boolean {
    const { mustBeTogether, mustNotBeTogether } = restrictions;

    if (type === 'mustBeTogether') {
      // Check if any pair in newUsers exists in mustNotBeTogether
      for (const usersSet of mustNotBeTogether) {
        for (let i = 0; i < newUsers.length; i++) {
          for (let j = i + 1; j < newUsers.length; j++) {
            const user1 = newUsers[i];
            const user2 = newUsers[j];
            if (usersSet.some(u => u._id === user1._id) && usersSet.some(u => u._id === user2._id)) {
              return true;
            }
          }
        }
      }
    } else if (type === 'mustNotBeTogether') {
      // Check if any pair in newUsers exists in mustBeTogether
      for (const usersSet of mustBeTogether) {
        for (let i = 0; i < newUsers.length; i++) {
          for (let j = i + 1; j < newUsers.length; j++) {
            const user1 = newUsers[i];
            const user2 = newUsers[j];
            if (usersSet.some(u => u._id === user1._id) && usersSet.some(u => u._id === user2._id)) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }

  /**
   * Verifica si se puede añadir más configuraciones de grupo
   * Ahora se basa en si hay estudiantes disponibles para formar más grupos
   */
  canAddMoreGroupConfigurations(): boolean {
    // Siempre permitir añadir configuraciones mientras haya estudiantes disponibles
    return this.selectedStudents.length > 0;
  }

  /**
   * Añade una nueva configuración de grupo basada en estudiantes disponibles
   */
  addGroupConfiguration(): void {
    const availableStudents = this.selectedStudents.length;
    
    if (availableStudents === 0) {
      console.log('❌ No hay estudiantes disponibles');
      return;
    }

    // Calcular un rango inteligente basado en estudiantes disponibles
    const suggestedGroupSize = 4; // Tamaño por defecto
    const maxPossibleGroups = Math.floor(availableStudents / suggestedGroupSize);
    const minGroups = Math.max(1, Math.floor(maxPossibleGroups * 0.5)); // Al menos la mitad
    const maxGroups = Math.max(1, maxPossibleGroups); // Máximo posible

    const newConfig: GroupConfiguration = {
      minQuantity: minGroups,
      maxQuantity: maxGroups,
      size: suggestedGroupSize,
      id: this.generateUniqueId()
    };
    
    this.groupConfigurations.push(newConfig);
    console.log('✅ Configuración añadida:', newConfig);
  }

  /**
   * Elimina una configuración de grupo
   */
  removeGroupConfiguration(index: number): void {
    this.groupConfigurations.splice(index, 1);
  }

  /**
   * Actualiza los cálculos cuando cambian las configuraciones
   * Ahora se basa en rangos flexibles
   */
  updateGroupConfiguration(): void {
    // Validar que las configuraciones sean coherentes con estudiantes disponibles
    this.groupConfigurations.forEach(config => {
      const maxPossibleGroups = Math.floor(this.selectedStudents.length / config.size);
      
      // Ajustar máximo si excede lo posible
      if (config.maxQuantity > maxPossibleGroups) {
        config.maxQuantity = Math.max(1, maxPossibleGroups);
      }
      
      // Asegurar que mínimo no sea mayor que máximo
      if (config.minQuantity > config.maxQuantity) {
        config.minQuantity = config.maxQuantity;
      }
    });
    
    console.log('✅ Configuraciones actualizadas:', this.groupConfigurations);
  }

  /**
   * Calcula el rango total de estudiantes que pueden ser asignados
   */
  getStudentAssignmentRange(): { min: number; max: number } {
    const minStudents = this.groupConfigurations.reduce((total, config) => {
      return total + (config.minQuantity * config.size);
    }, 0);
    
    const maxStudents = this.groupConfigurations.reduce((total, config) => {
      return total + (config.maxQuantity * config.size);
    }, 0);
    
    return { min: minStudents, max: maxStudents };
  }

  /**
   * Calcula el rango total de grupos configurados
   */
  getGroupsRange(): { min: number; max: number } {
    const minGroups = this.groupConfigurations.reduce((total, config) => {
      return total + config.minQuantity;
    }, 0);
    
    const maxGroups = this.groupConfigurations.reduce((total, config) => {
      return total + config.maxQuantity;
    }, 0);
    
    return { min: minGroups, max: maxGroups };
  }

  /**
   * Método de compatibilidad - devuelve el máximo de estudiantes asignados
   */
  getTotalStudentsInGroups(): number {
    return this.getStudentAssignmentRange().max;
  }

  /**
   * Método de compatibilidad - devuelve el máximo de grupos configurados
   */
  getTotalGroupsConfigured(): number {
    return this.getGroupsRange().max;
  }

  /**
   * Calcula estudiantes restantes sin asignar (basado en el mínimo)
   */
  getRemainingStudents(): number {
    const minAssigned = this.getStudentAssignmentRange().min;
    return Math.max(0, this.selectedStudents.length - minAssigned);
  }

  /**
   * Obtiene resumen flexible de la configuración de grupos
   */
  getGroupsConfigurationSummary(): string {
    if (this.groupConfigurations.length === 0) {
      return `${this.selectedStudents.length} estudiantes disponibles`;
    }
    
    const { min: minGroups, max: maxGroups } = this.getGroupsRange();
    const { min: minStudents, max: maxStudents } = this.getStudentAssignmentRange();
    
    if (minGroups === maxGroups) {
      return `${minGroups} grupos • ${minStudents}${minStudents !== maxStudents ? `-${maxStudents}` : ''} estudiantes`;
    }
    
    return `Entre ${minGroups}-${maxGroups} grupos • ${minStudents}-${maxStudents} estudiantes`;
  }

  /**
   * Obtiene resumen de una configuración específica
   */
  getConfigurationSummary(config: GroupConfiguration): string {
    const minStudents = config.minQuantity * config.size;
    const maxStudents = config.maxQuantity * config.size;
    
    if (minStudents === maxStudents) {
      return `${minStudents} estudiantes`;
    }
    
    return `${minStudents}-${maxStudents} estudiantes`;
  }

  /**
   * Obtiene mensaje de validación actualizado para rangos flexibles
   */
  getValidationMessage(): string {
    const selected = this.selectedStudents.length;
    
    if (selected === 0) {
      return 'Selecciona los estudiantes que quieres agrupar';
    }
    
    if (this.groupConfigurations.length === 0) {
      return `${selected} estudiantes disponibles. Añade configuraciones de grupo para comenzar.`;
    }
    
    const { min: minStudents, max: maxStudents } = this.getStudentAssignmentRange();
    const { min: minGroups, max: maxGroups } = this.getGroupsRange();
    
    if (maxStudents === 0) {
      return 'Define el tamaño y rango de los grupos';
    }
    
    if (minStudents > selected) {
      const needed = minStudents - selected;
      return `Necesitas al menos ${needed} estudiante${needed > 1 ? 's' : ''} más para la configuración mínima`;
    }
    
    if (maxStudents < selected) {
      const remaining = selected - maxStudents;
      return `Hasta ${remaining} estudiante${remaining > 1 ? 's' : ''} podrían quedar sin asignar`;
    }
    
    if (minStudents === maxStudents && minStudents === selected) {
      return '¡Configuración perfecta! Todos los estudiantes serán asignados';
    }
    
    return `El algoritmo creará entre ${minGroups}-${maxGroups} grupos con ${selected} estudiantes disponibles`;
  }

  /**
   * Obtiene tipo de validación actualizado para rangos flexibles
   */
  getValidationType(): 'success' | 'warning' | 'error' | 'info' {
    const selected = this.selectedStudents.length;
    
    if (selected === 0) {
      return 'error';
    }
    
    if (this.groupConfigurations.length === 0) {
      return 'info';
    }
    
    const { min: minStudents, max: maxStudents } = this.getStudentAssignmentRange();
    
    if (maxStudents === 0) {
      return 'error';
    }
    
    if (minStudents > selected) {
      return 'error';
    }
    
    if (maxStudents < selected) {
      return 'warning';
    }
    
    return 'success';
  }

  /**
   * Genera vista previa de los grupos basada en rangos
   */
  getGroupsPreview(): GroupPreview[] {
    const previews: GroupPreview[] = [];
    let colorIndex = 0;
    
    this.groupConfigurations.forEach((config, configIndex) => {
      // Mostrar el promedio del rango para la vista previa
      const avgQuantity = Math.ceil((config.minQuantity + config.maxQuantity) / 2);
      
      for (let i = 0; i < avgQuantity; i++) {
        previews.push({
          name: `Grupo ${previews.length + 1}`,
          size: config.size,
          color: this.groupColors[colorIndex % this.groupColors.length]
        });
        colorIndex++;
      }
    });
    
    return previews;
  }

  /**
   * Validación actualizada para habilitar el botón de crear grupos
   */
  canCreateGroups(): boolean {
    if (this.selectedStudents.length === 0) return false;
    
    // Con configuraciones específicas: verificar que sea factible
    if (this.groupConfigurations.length > 0) {
      return this.getValidationType() === 'success' || this.getValidationType() === 'warning';
    }
    
    // Sin configuraciones: siempre permitir si hay estudiantes
    return true;
  }

  /**
   * Crea los grupos con la nueva configuración flexible
   */
  onCreateGroups(): void {
    if (!this.canCreateGroups()) {
      return;
    }

    const algorithmData = new BelbinAlgorithmData();    
    
    // Añadir miembros seleccionados
    this.selectedStudents.forEach(user => {
      algorithmData.addMember({ id: user._id, traits: user.traits ?? [] });
    });

    // Añadir constraints básicas
    algorithmData.addConstraint("AllAssigned", "", { number_members: this.selectedStudents.length });
    algorithmData.addConstraint("NonOverlapping", "");
    
    // Si hay configuraciones específicas, usar rangos flexibles
    if (this.groupConfigurations.length > 0) {
      this.groupConfigurations.forEach((config, index) => {
        algorithmData.addConstraint("SizeCardinality", `config_${index}`, { 
          team_size: config.size, 
          min: config.minQuantity, 
          max: config.maxQuantity 
        });
      });
    } else {
      // Si no hay configuraciones específicas, crear una configuración automática
      const availableStudents = this.selectedStudents.length;
      const defaultGroupSize = 4;
      const maxPossibleGroups = Math.floor(availableStudents / defaultGroupSize);
      
      if (maxPossibleGroups > 0) {
        algorithmData.addConstraint("SizeCardinality", "auto_config", {
          team_size: defaultGroupSize,
          min: 1,
          max: maxPossibleGroups
        });
      }
    }

    // Añadir restricciones personalizadas
    this.restrictions.mustBeTogether.forEach(restriction => {
      algorithmData.addConstraint("SameTeam", "", { members: restriction.map(u => u._id) });
    });

    this.restrictions.mustNotBeTogether.forEach(restriction => {
      algorithmData.addConstraint("DifferentTeam", "", { members: restriction.map(u => u._id) });
    });

    // Configurar algoritmo
    algorithmData.number_members = this.selectedStudents.length;

    console.log('🎯 Configuración de grupos enviada:', {
      estudiantes: this.selectedStudents.length,
      configuracionesEspecificas: this.groupConfigurations,
      rangosGrupos: this.getGroupsRange(),
      restricciones: this.restrictions
    });

    // Enviar solicitud al backend
    this.activityService.createGroupsAlgorithm(this.activityId, algorithmData.toDTO()).subscribe({
      next: (res) => {
        console.log('✅ Grupos creados exitosamente:', res);
        this.onRequestSent.emit(true);
      },
      error: (error) => {
        console.error('❌ Error creando grupos:', error);
        // Aquí podrías añadir manejo de errores más sofisticado
      }
    });    
  }

  /**
   * Genera un ID único para configuraciones
   */
  private generateUniqueId(): string {
    return `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Métodos existentes mantenidos para compatibilidad
  ngOnInit() {
    // Inicialización si es necesaria
  }

  prevStep() {
    this.active = Math.max(0, this.active - 1);
  }

  nextStep() {
    this.active = Math.min(2, this.active + 1);
  }

  removeItemFromArray<T>(array: T[], item: T): void {
    const index = array.indexOf(item);
    if (index > -1) {
      array.splice(index, 1);
    }
  }

  addRestrictionMustBeTogether(): void {
    if (this.selectedRestrictionStudents.length >= 2) {
      this.restrictions.mustBeTogether.push([...this.selectedRestrictionStudents]);
      this.selectedRestrictionStudents = [];
    }
  }

  addRestrictionMustNotBeTogether(): void {
    if (this.selectedRestrictionStudents.length >= 2) {
      this.restrictions.mustNotBeTogether.push([...this.selectedRestrictionStudents]);
      this.selectedRestrictionStudents = [];
    }
  }

  addRestrictionMustBeAGroup(): void {
    if (this.selectedRestrictionStudents.length >= 2) {
      this.restrictions.mustBeAGroup.push([...this.selectedRestrictionStudents]);
      this.selectedRestrictionStudents = [];
    }
  }
}

