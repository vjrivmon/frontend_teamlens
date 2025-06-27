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
 * Interfaz para configuración de un tipo de grupo
 */
interface GroupConfiguration {
  quantity: number;    // Número de grupos de este tipo
  size: number;        // Tamaño de cada grupo
  id?: string;         // ID único para el tracking
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

  teamBuilderForm = this.formBuilder.group({
    algorithm: [this.questionnaires[0] || {} as IQuestionnaire, [Validators.required]],
    minGroups: [3 as number | null, [Validators.required, Validators.min(1), Validators.max(20)]],
    maxGroups: [8 as number | null, [Validators.required, Validators.min(1), Validators.max(50)]]
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

  // Configuraciones de grupos múltiples
  groupConfigurations: GroupConfiguration[] = [];
  
  // Colores para la vista previa
  private readonly groupColors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', 
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];
  


  constructor(private formBuilder: FormBuilder, private activityService: ActivitiesService) { 
    // Dejar vacío para que el usuario configure manualmente
    
    // Suscribirse a cambios en los límites globales para validar configuraciones existentes
    this.teamBuilderForm.get('maxGroups')?.valueChanges.subscribe((newMaxGroups) => {
      console.log('🔄 Cambio en maxGroups:', newMaxGroups);
      this.updateGroupConfiguration();
    });
    
    this.teamBuilderForm.get('minGroups')?.valueChanges.subscribe((newMinGroups) => {
      console.log('🔄 Cambio en minGroups:', newMinGroups);
      this.updateGroupConfiguration();
    });
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
   */
  canAddMoreGroupConfigurations(): boolean {
    const maxGroupsControl = this.teamBuilderForm.get('maxGroups');
    const maxGroups = maxGroupsControl?.value;
    
    console.log('🔍 Verificando límite completo:', { 
      maxGroupsControl: maxGroupsControl?.value, 
      hasValue: !!maxGroups 
    });
    
    // Si no hay límite máximo definido, permitir
    if (!maxGroups || maxGroups === 0) {
      return true;
    }
    
    const currentTotalGroups = this.getTotalGroupsConfigured();
    const canAdd = currentTotalGroups < maxGroups;
    
    console.log('🔍 Resultado validación:', { 
      currentTotalGroups, 
      maxGroups, 
      canAdd,
      configurations: this.groupConfigurations.length
    });
    
    return canAdd;
  }

  /**
   * Añade una nueva configuración de grupo
   */
  addGroupConfiguration(): void {
    const maxGroups = this.teamBuilderForm.get('maxGroups')?.value;
    const currentTotal = this.getTotalGroupsConfigured();
    
    console.log('➕ Intentando añadir grupo:', { currentTotal, maxGroups });
    
    // Verificar si se puede añadir más grupos
    if (maxGroups && maxGroups > 0 && currentTotal >= maxGroups) {
      console.log('❌ No se puede añadir: límite alcanzado');
      return; // No hacer nada si se alcanzó el límite
    }

    const newConfig: GroupConfiguration = {
      quantity: 1,
      size: 4,
      id: this.generateUniqueId()
    };
    
    this.groupConfigurations.push(newConfig);
    console.log('✅ Configuración añadida:', newConfig);
    this.updateGroupConfiguration();
  }

  /**
   * Elimina una configuración de grupo
   */
  removeGroupConfiguration(index: number): void {
    if (this.groupConfigurations.length > 1) {
      this.groupConfigurations.splice(index, 1);
      this.updateGroupConfiguration();
    }
  }

  /**
   * Actualiza los cálculos cuando cambian las configuraciones
   */
  updateGroupConfiguration(): void {
    // Validar que no se exceda el límite máximo de grupos
    const maxGroups = this.teamBuilderForm.get('maxGroups')?.value;
    
    if (maxGroups && maxGroups > 0) {
      const totalGroups = this.getTotalGroupsConfigured();
      console.log('📊 Actualizando configuración:', { totalGroups, maxGroups });
      
      if (totalGroups > maxGroups) {
        console.log('⚠️ Excede el límite, ajustando...');
        
        // Calcular el exceso
        let excess = totalGroups - maxGroups;
        
        // Reducir desde la última configuración hacia atrás
        for (let i = this.groupConfigurations.length - 1; i >= 0 && excess > 0; i--) {
          const config = this.groupConfigurations[i];
          const maxReduction = config.quantity - 1; // Mantener al menos 1
          const reduction = Math.min(maxReduction, excess);
          
          if (reduction > 0) {
            config.quantity -= reduction;
            excess -= reduction;
            console.log(`🔧 Reducido config ${i}: quantity=${config.quantity}, excess restante=${excess}`);
          }
        }
        
        // Si aún hay exceso, eliminar configuraciones
        while (excess > 0 && this.groupConfigurations.length > 0) {
          const lastConfig = this.groupConfigurations[this.groupConfigurations.length - 1];
          if (lastConfig.quantity <= excess) {
            excess -= lastConfig.quantity;
            this.groupConfigurations.pop();
            console.log('🗑️ Eliminada última configuración');
          } else {
            lastConfig.quantity -= excess;
            excess = 0;
          }
        }
      }
    }
    
    // Trigger change detection y validaciones
    console.log('✅ Configuración actualizada:', this.groupConfigurations);
  }



  /**
   * Calcula el total de estudiantes asignados a grupos
   */
  getTotalStudentsInGroups(): number {
    return this.groupConfigurations.reduce((total, config) => {
      return total + (config.quantity * config.size);
    }, 0);
  }

  /**
   * Calcula el total de grupos configurados
   */
  getTotalGroupsConfigured(): number {
    return this.groupConfigurations.reduce((total, config) => {
      return total + config.quantity;
    }, 0);
  }

  /**
   * Obtiene el máximo número de grupos permitido para una configuración individual
   */
  getMaxGroupsForConfig(): number {
    const maxGroups = this.teamBuilderForm.get('maxGroups')?.value;
    
    if (!maxGroups || maxGroups === 0) {
      return 20; // Valor por defecto si no hay límite
    }
    
    // El máximo para una configuración individual es el límite global
    // (la validación se hará después en updateGroupConfiguration)
    return maxGroups;
  }

  /**
   * Actualiza el valor mínimo de grupos
   */
  updateMinGroups(value: number | null): void {
    this.teamBuilderForm.patchValue({ minGroups: value });
  }

  /**
   * Actualiza el valor máximo de grupos
   */
  updateMaxGroups(value: number | null): void {
    this.teamBuilderForm.patchValue({ maxGroups: value });
  }

  /**
   * Calcula estudiantes restantes sin asignar
   */
  getRemainingStudents(): number {
    return Math.max(0, this.selectedStudents.length - this.getTotalStudentsInGroups());
  }

  /**
   * Obtiene resumen de la configuración de grupos
   */
  getGroupsConfigurationSummary(): string {
    const totalGroups = this.groupConfigurations.reduce((total, config) => total + config.quantity, 0);
    const totalStudents = this.getTotalStudentsInGroups();
    const maxGroups = this.teamBuilderForm.get('maxGroups')?.value;
    
    if (maxGroups && maxGroups > 0) {
      if (totalGroups >= maxGroups) {
        return `${totalGroups}/${maxGroups} grupos (límite alcanzado) • ${totalStudents} estudiantes`;
      } else {
        return `${totalGroups}/${maxGroups} grupos • ${totalStudents} estudiantes`;
      }
    }
    
    return `${totalGroups} grupos • ${totalStudents} estudiantes`;
  }

  /**
   * Obtiene resumen de una configuración específica
   */
  getConfigurationSummary(config: GroupConfiguration): string {
    const totalStudents = config.quantity * config.size;
    return `${totalStudents} estudiantes`;
  }

  /**
   * Obtiene mensaje de validación
   */
  getValidationMessage(): string {
    const total = this.getTotalStudentsInGroups();
    const selected = this.selectedStudents.length;
    const minGroups = this.teamBuilderForm.get('minGroups')?.value;
    const maxGroups = this.teamBuilderForm.get('maxGroups')?.value;
    
    // Validar rangos de grupos
    if (minGroups && maxGroups && minGroups > maxGroups) {
      return 'El número máximo de grupos debe ser mayor o igual al mínimo';
    }
    
    if (selected === 0) {
      return 'Selecciona los estudiantes que quieres agrupar';
    }
    
    // Si no hay configuraciones específicas, validar solo los límites globales
    if (this.groupConfigurations.length === 0) {
      if (!minGroups || !maxGroups) {
        return 'Define el rango de grupos (mínimo y máximo) o añade configuraciones específicas';
      }
      return `Configuración lista: El algoritmo creará entre ${minGroups} y ${maxGroups} grupos con ${selected} estudiantes`;
    }
    
    if (total === 0) {
      return 'Define el tamaño y cantidad de los grupos';
    }
    
    if (total > selected) {
      const difference = total - selected;
      return `Necesitas ${difference} estudiante${difference > 1 ? 's' : ''} más para completar esta configuración`;
    }
    
    if (total < selected) {
      const remaining = selected - total;
      return `${remaining} estudiante${remaining > 1 ? 's' : ''} quedarán sin asignar a ningún grupo`;
    }
    
    return '¡Configuración perfecta! Todos los estudiantes serán asignados a grupos específicos';
  }

  /**
   * Obtiene tipo de validación (success, warning, error)
   */
  getValidationType(): 'success' | 'warning' | 'error' | 'info' {
    const total = this.getTotalStudentsInGroups();
    const selected = this.selectedStudents.length;
    const minGroups = this.teamBuilderForm.get('minGroups')?.value;
    const maxGroups = this.teamBuilderForm.get('maxGroups')?.value;
    
    // Error: validación de rangos
    if (minGroups && maxGroups && minGroups > maxGroups) {
      return 'error';
    }
    
    // Error: sin estudiantes
    if (selected === 0) {
      return 'error';
    }
    
    // Si no hay configuraciones específicas, usar solo límites globales
    if (this.groupConfigurations.length === 0) {
      if (!minGroups || !maxGroups) {
        return 'info';
      }
      // Con rangos válidos pero sin configuraciones específicas
      return 'success';
    }
    
    // Estados de error para configuraciones específicas
    if (total === 0) {
      return 'error';
    }
    
    // Estado de advertencia: desbalance en configuraciones específicas
    if (total !== selected) {
      return 'warning';
    }
    
    // Estado perfecto para configuraciones específicas
    return 'success';
  }

  /**
   * Genera vista previa de los grupos
   */
  getGroupsPreview(): GroupPreview[] {
    const previews: GroupPreview[] = [];
    let colorIndex = 0;
    
    this.groupConfigurations.forEach((config, configIndex) => {
      for (let i = 0; i < config.quantity; i++) {
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
   * Validación para habilitar el botón de crear grupos
   */
  canCreateGroups(): boolean {
    const minGroups = this.teamBuilderForm.get('minGroups')?.value;
    const maxGroups = this.teamBuilderForm.get('maxGroups')?.value;
    
    // Validaciones básicas
    if (this.selectedStudents.length === 0) return false;
    if (minGroups && maxGroups && minGroups > maxGroups) return false;
    
    // Con configuraciones específicas: debe estar balanceado perfectamente
    if (this.groupConfigurations.length > 0) {
      return this.getValidationType() === 'success';
    }
    
    // Sin configuraciones específicas: solo necesita rangos válidos
    return !!(minGroups && maxGroups && minGroups <= maxGroups);
  }

  /**
   * Crea los grupos con la nueva configuración
   */
  onCreateGroups(): void {
    if (!this.canCreateGroups()) {
      return;
    }

    const algorithmData = new BelbinAlgorithmData();    
    const minGroups = this.teamBuilderForm.get('minGroups')?.value;
    const maxGroups = this.teamBuilderForm.get('maxGroups')?.value;
    
    // Añadir miembros seleccionados
    this.selectedStudents.forEach(user => {
      algorithmData.addMember({ id: user._id, traits: user.traits ?? [] });
    });

    // Añadir constraints básicas
    algorithmData.addConstraint("AllAssigned", "", { number_members: this.selectedStudents.length });
    algorithmData.addConstraint("NonOverlapping", "");
    
    // Si hay configuraciones específicas, usarlas
    if (this.groupConfigurations.length > 0) {
      this.groupConfigurations.forEach((config, index) => {
        algorithmData.addConstraint("SizeCardinality", `config_${index}`, { 
          team_size: config.size, 
          min: config.quantity, 
          max: config.quantity 
        });
      });
    } else {
      // Si no hay configuraciones específicas, usar los límites globales
      // Crear constraint básico con los límites
      if (minGroups && maxGroups) {
        algorithmData.addConstraint("SizeCardinality", "global_range", {
          team_size: 4, // Tamaño por defecto
          min: minGroups,
          max: maxGroups
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
      minGroups: minGroups,
      maxGroups: maxGroups,
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

