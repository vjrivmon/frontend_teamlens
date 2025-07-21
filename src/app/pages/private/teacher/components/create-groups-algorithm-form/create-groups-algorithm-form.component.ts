import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../../../environments/environment';

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
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { IUser, IQuestionnaire } from '../../../../../models/models';
import { ActivitiesService } from '../../../../../services/activities.service';

import BelbinAlgorithmData from '../../../../../models/algorithm-data';

// Importar el componente modal para el progreso del algoritmo
import { AlgorithmProgressModalComponent } from '../algorithm-progress-modal/algorithm-progress-modal.component';

// Importaciones de RxJS para manejo de timeout
import { timeout, catchError } from 'rxjs/operators';
import { throwError, TimeoutError } from 'rxjs';

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
  imports: [
    CommonModule, 
    ReactiveFormsModule, 
    FormsModule, 
    ButtonModule, 
    InputTextModule, 
    InputNumberModule, 
    InputTextareaModule, 
    StepperModule, 
    DropdownModule, 
    TableModule, 
    TagModule, 
    ProgressSpinnerModule,
    AlgorithmProgressModalComponent  // Componente modal para progreso del algoritmo
  ],
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

  // Estados del algoritmo
  isAlgorithmRunning: boolean = false;
  algorithmProgress: string = '';
  estimatedTime: number = 0;
  elapsedTime: number = 0;
  private algorithmTimer: any;

  // NUEVO: Variables para el modal de progreso dedicado
  showProgressModal: boolean = false;
  algorithmCompleted: boolean = false;
  algorithmSuccess: boolean = false;
  algorithmsGroupsCreated: number = 0;
  algorithmErrorMessage: string = '';

  // NUEVO: Variables para la interfaz mejorada de estudiantes
  private filteredStudents: IUser[] = [];

  // Configuraciones de grupos múltiples con rangos flexibles
  groupConfigurations: GroupConfiguration[] = [];
  
  // Colores para la vista previa
  private readonly groupColors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', 
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];
  
  constructor(
    private activitiesService: ActivitiesService,
    private router: Router,
    private formBuilder: FormBuilder
  ) { 
    // Inicializar estudiantes filtrados
    this.filteredStudents = [...this.students];
  }

  ngOnInit(): void {
    console.log('🚀 CreateGroupsAlgorithmFormComponent inicializado');
    console.log(`📊 Actividad: ${this.activityId}`);
    console.log(`👥 Estudiantes disponibles: ${this.students.length}`);
    
    // Inicializar estudiantes filtrados
    this.filteredStudents = [...this.students];
  }

  /**
   * NUEVO: Métodos para la interfaz mejorada de selección de estudiantes
   */

  /**
   * Filtra estudiantes basado en el término de búsqueda
   */
  filterStudents(): void {
    if (!this.searchValue || this.searchValue.trim() === '') {
      this.filteredStudents = [...this.students];
    } else {
      const searchTerm = this.searchValue.toLowerCase().trim();
      this.filteredStudents = this.students.filter(student => 
        student.name?.toLowerCase().includes(searchTerm) ||
        student.email?.toLowerCase().includes(searchTerm)
      );
    }
  }

  /**
   * Obtiene la lista de estudiantes filtrados
   */
  getFilteredStudents(): IUser[] {
    return this.filteredStudents;
  }

  /**
   * Verifica si un estudiante está seleccionado
   */
  isStudentSelected(student: IUser): boolean {
    return this.selectedStudents.some(s => s._id === student._id);
  }

  /**
   * Alterna la selección de un estudiante
   */
  toggleStudentSelection(student: IUser): void {
    if (this.isStudentSelected(student)) {
      this.selectedStudents = this.selectedStudents.filter(s => s._id !== student._id);
    } else {
      this.selectedStudents.push(student);
    }
    this.onStudentsChange();
  }

  /**
   * Obtiene las iniciales de un estudiante para el avatar
   */
  getStudentInitials(student: IUser): string {
    if (student.name) {
      const names = student.name.trim().split(' ');
      if (names.length >= 2) {
        return (names[0][0] + names[1][0]).toUpperCase();
      }
      return names[0][0].toUpperCase();
    }
    return student.email[0].toUpperCase();
  }

  /**
   * Limpia la selección de estudiantes
   */
  clearStudentSelection(): void {
    this.selectedStudents = [];
    this.onStudentsChange();
  }

  /**
   * Selecciona todos los estudiantes filtrados
   */
  selectAllStudents(): void {
    this.selectedStudents = [...this.filteredStudents];
    this.onStudentsChange();
  }

  /**
   * NUEVO: Métodos para la interfaz mejorada de restricciones
   */

  /**
   * Verifica si un estudiante está en la selección para restricciones
   */
  isStudentInRestrictionSelection(student: IUser): boolean {
    return this.selectedRestrictionStudents.some(s => s._id === student._id);
  }

  /**
   * Alterna la selección de un estudiante para restricciones
   */
  toggleRestrictionStudentSelection(student: IUser): void {
    if (this.isStudentInRestrictionSelection(student)) {
      this.selectedRestrictionStudents = this.selectedRestrictionStudents.filter(s => s._id !== student._id);
    } else {
      this.selectedRestrictionStudents.push(student);
    }
    console.log(`🎯 Estudiante ${student.name} ${this.isStudentInRestrictionSelection(student) ? 'añadido a' : 'removido de'} selección de restricciones`);
  }

  /**
   * Limpia la selección de estudiantes para restricciones
   */
  clearRestrictionSelection(): void {
    this.selectedRestrictionStudents = [];
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
    console.log(`🔍 [CreateRestriction] Iniciando creación de restricción tipo: ${restrictionType}`);
    console.log(`👥 [CreateRestriction] Estudiantes seleccionados: ${this.selectedRestrictionStudents.length}`);
    console.log(`📋 [CreateRestriction] Lista de estudiantes:`, this.selectedRestrictionStudents.map(s => s.email));

    if (this.selectedRestrictionStudents.length < 2) {
      console.log(`❌ [CreateRestriction] Insuficientes estudiantes seleccionados (${this.selectedRestrictionStudents.length})`);
      alert("Debes seleccionar al menos 2 estudiantes para crear una restricción");
      return;
    }

    // Check if the restriction is valid and makes sense with another ones
    const conflict = this.hasConflict(this.restrictions, this.selectedRestrictionStudents, restrictionType as 'mustBeTogether' | 'mustNotBeTogether') //todo: enum

    if (conflict) {
      console.log(`⚠️ [CreateRestriction] Conflicto detectado con restricción existente`);
      alert("Esta restricción entra en conflicto con otra existente");
      return;
    }

    // CRÍTICO: Crear una COPIA de los estudiantes seleccionados para evitar referencias
    const restrictionStudents = [...this.selectedRestrictionStudents];
    console.log(`✅ [CreateRestriction] Añadiendo restricción con ${restrictionStudents.length} estudiantes`);
    console.log(`📧 [CreateRestriction] Emails: ${restrictionStudents.map(s => s.email).join(', ')}`);

    this.restrictions[restrictionType].push(restrictionStudents);
    this.selectedRestrictionStudents = [];
    
    console.log(`🎯 [CreateRestriction] Estado final de restricciones:`, {
      mustBeTogether: this.restrictions.mustBeTogether.length,
      mustNotBeTogether: this.restrictions.mustNotBeTogether.length,
      mustBeAGroup: this.restrictions.mustBeAGroup.length
    });
    
    // Debug detallado de restricciones mustBeTogether
    this.restrictions.mustBeTogether.forEach((restriction, index) => {
      console.log(`   mustBeTogether[${index}]: ${restriction.map(s => s.email).join(', ')} (${restriction.length} estudiantes)`);
    });
    
    // Debug detallado de restricciones mustNotBeTogether  
    this.restrictions.mustNotBeTogether.forEach((restriction, index) => {
      console.log(`   mustNotBeTogether[${index}]: ${restriction.map(s => s.email).join(', ')} (${restriction.length} estudiantes)`);
    });
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
   * MEJORADO: Ahora espera el resultado real del algoritmo con timeouts y mejor progreso
   */
  onCreateGroups(): void {
    if (!this.canCreateGroups()) {
      return;
    }

    // Iniciar indicador visual mejorado
    this.startAlgorithmProgress();

    const algorithmData = new BelbinAlgorithmData();    
    
    // NO enviar members con traits - el backend los obtendrá automáticamente
    // Solo enviar el número de estudiantes seleccionados
    algorithmData.number_members = this.selectedStudents.length;

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

    // MEJORADO: Añadir restricciones personalizadas con logging detallado
    console.log(`🔍 [onCreateGroups] DEBUG - Procesando restricciones ANTES de enviar:`);
    console.log(`   mustBeTogether total: ${this.restrictions.mustBeTogether.length}`);
    console.log(`   mustNotBeTogether total: ${this.restrictions.mustNotBeTogether.length}`);
    
    this.restrictions.mustBeTogether.forEach((restriction, index) => {
      console.log(`🤝 [onCreateGroups] Procesando mustBeTogether[${index}]:`, {
        cantidad: restriction.length,
        emails: restriction.map(u => u.email),
        ids: restriction.map(u => u._id)
      });
      
      if (restriction.length >= 2) {
        algorithmData.addConstraint("SameTeam", "", { members: restriction.map(u => u._id) });
        console.log(`✅ [onCreateGroups] SameTeam constraint añadida para ${restriction.length} estudiantes`);
      } else {
        console.log(`⚠️ [onCreateGroups] mustBeTogether ignorada - solo tiene ${restriction.length} estudiante(s)`);
      }
    });

    this.restrictions.mustNotBeTogether.forEach((restriction, index) => {
      console.log(`🚫 [onCreateGroups] Procesando mustNotBeTogether[${index}]:`, {
        cantidad: restriction.length,
        emails: restriction.map(u => u.email),
        ids: restriction.map(u => u._id)
      });
      
      if (restriction.length >= 2) {
        algorithmData.addConstraint("DifferentTeam", "", { members: restriction.map(u => u._id) });
        console.log(`✅ [onCreateGroups] DifferentTeam constraint añadida para ${restriction.length} estudiantes`);
      } else {
        console.log(`⚠️ [onCreateGroups] mustNotBeTogether ignorada - solo tiene ${restriction.length} estudiante(s)`);
      }
    });

    console.log('🎯 Configuración de grupos enviada:', {
      estudiantes: this.selectedStudents.length,
      configuracionesEspecificas: this.groupConfigurations,
      rangosGrupos: this.getGroupsRange(),
      restricciones: this.restrictions,
      algorithmData: algorithmData
    });

    // MEJORADO: Configurar timeout más largo para esperar el resultado real
    const timeoutDuration = Math.max(60000, this.selectedStudents.length * 3000); // Mínimo 1 minuto, 3 segundos por estudiante
    console.log(`⏱️ Configurando timeout de ${timeoutDuration / 1000} segundos para el algoritmo`);

    // Enviar el algorithmData completo al backend junto con los IDs de estudiantes
    this.http.post(`${environment.apiUrl}/activities/${this.activityId}/algorithm/execute`, {
      algorithmData: algorithmData.toDTO(),
      selectedStudentIds: this.selectedStudents.map(s => s._id),
      groupConfigurations: this.groupConfigurations,
      restrictions: this.restrictions
    }).pipe(
      timeout(timeoutDuration),
      catchError((error: any) => {
        console.error('❌ Error ejecutando algoritmo:', error);
        
        // Manejar diferentes tipos de errores
        let errorMessage = 'Error desconocido ejecutando el algoritmo';
        
        if (error instanceof TimeoutError) {
          errorMessage = `El algoritmo está tardando más de lo esperado (${timeoutDuration / 1000}s). Continúa ejecutándose en segundo plano.`;
          console.log('⏰ Timeout alcanzado, pero el algoritmo puede continuar ejecutándose');
          
          // En caso de timeout, iniciar polling para verificar si completó
          this.startPollingForResult();
          return throwError(() => new Error(errorMessage));
        } else if (error.status === 409) {
          errorMessage = 'El algoritmo ya se está ejecutando para esta actividad';
        } else if (error.status === 400) {
          errorMessage = error.error?.message || 'Error de configuración en el algoritmo';
        } else if (error.status === 500) {
          errorMessage = 'Error interno del servidor ejecutando el algoritmo';
        } else if (error.status === 0) {
          errorMessage = 'Error de conexión con el servidor';
        }
        
        return throwError(() => new Error(errorMessage));
      })
    ).subscribe({
      next: (res: any) => {
        console.log('🎉 Algoritmo completado exitosamente:', res);
        
        // El algoritmo terminó correctamente
        this.stopAlgorithmProgress(true);
        
        // Mostrar información detallada del resultado
        this.showAlgorithmCompletionInfo(res);
        
        // MEJORADO: Emitir evento y forzar actualización
        console.log('📤 Emitiendo evento de finalización del algoritmo...');
        this.onRequestSent.emit(true);
        
        // Pequeño delay para asegurar que el evento se procese
        setTimeout(() => {
          // Forzar detección de cambios si es necesario
          if (typeof window !== 'undefined') {
            console.log('🔄 Algoritmo completado, los grupos deberían actualizarse automáticamente');
          }
        }, 500);
      },
      error: (error: any) => {
        console.error('❌ Error ejecutando algoritmo:', error);
        
        // Manejar diferentes tipos de errores
        let errorMessage = 'Error desconocido ejecutando el algoritmo';
        
        if (error instanceof TimeoutError) {
          errorMessage = `El algoritmo está tardando más de lo esperado (${timeoutDuration / 1000}s). Continúa ejecutándose en segundo plano.`;
          console.log('⏰ Timeout alcanzado, pero el algoritmo puede continuar ejecutándose');
          
          // En caso de timeout, iniciar polling para verificar si completó
          this.startPollingForResult();
          return; // No detener el progreso todavía
        } else if (error.status === 409) {
          errorMessage = 'El algoritmo ya se está ejecutando para esta actividad';
        } else if (error.status === 400) {
          errorMessage = error.error?.message || 'Error de configuración en el algoritmo';
        } else if (error.status === 500) {
          errorMessage = 'Error interno del servidor ejecutando el algoritmo';
        } else if (error.status === 0) {
          errorMessage = 'Error de conexión con el servidor';
        }
        
        this.stopAlgorithmProgress(false, errorMessage);
      }
    });    
  }

  /**
   * Muestra información detallada cuando el algoritmo se completa exitosamente
   * MODIFICADO: Configura el estado del modal
   */
  private showAlgorithmCompletionInfo(result: any): void {
    const teamsCount = result.teamsCreated || result.result?.teamsCount || 0;
    const executionTime = result.executionTime ? Math.round(result.executionTime / 1000) : 0;
    
    console.log(`🎊 Algoritmo completado: ${teamsCount} equipos creados en ${executionTime}s`);
    
    // NUEVO: Configurar estado del modal con información específica
    this.algorithmsGroupsCreated = teamsCount;
    this.algorithmProgress = `¡${teamsCount} equipos creados exitosamente en ${executionTime} segundos!`;
  }

  /**
   * Inicia polling para verificar si el algoritmo completó después de un timeout
   */
  private startPollingForResult(): void {
    console.log('🔄 Iniciando polling para verificar estado del algoritmo...');
    
    // Cambiar el mensaje de progreso
    this.algorithmProgress = '🔄 Verificando estado del algoritmo...';
    
    // Polling cada 5 segundos por hasta 5 minutos
    const maxPollingAttempts = 60; // 5 minutos / 5 segundos
    let pollingAttempts = 0;
    
    const pollingInterval = setInterval(() => {
      pollingAttempts++;
      
      if (pollingAttempts > maxPollingAttempts) {
        clearInterval(pollingInterval);
        this.stopAlgorithmProgress(false, 'Timeout verificando el estado del algoritmo');
        return;
      }
      
      // Verificar estado de la actividad
      this.http.get(`/activities/${this.activityId}`).subscribe({
        next: (activity: any) => {
          console.log(`🔍 Polling ${pollingAttempts}/${maxPollingAttempts}: Estado = ${activity.algorithmStatus}`);
          
          if (activity.algorithmStatus === 'done') {
            clearInterval(pollingInterval);
            console.log('✅ Algoritmo completado detectado via polling');
            
            this.stopAlgorithmProgress(true);
            this.showAlgorithmCompletionInfo({ 
              teamsCreated: activity.algorithmResult?.teamsCount || 0,
              executionTime: 0 
            });
            
            // MEJORADO: Asegurar que se emita el evento de finalización
            console.log('📤 [Polling] Emitiendo evento de finalización del algoritmo...');
            this.onRequestSent.emit(true);
            
            // Forzar actualización después del polling
            setTimeout(() => {
              console.log('🔄 [Polling] Algoritmo completado, forzando actualización de la interfaz');
            }, 200);
            
          } else if (activity.algorithmStatus === 'error') {
            clearInterval(pollingInterval);
            console.log('❌ Error del algoritmo detectado via polling');
            
            const errorMsg = activity.algorithmError || 'Error desconocido en el algoritmo';
            this.stopAlgorithmProgress(false, errorMsg);
          }
          // Si sigue 'running', continuar polling
        },
        error: (error: any) => {
          console.error(`❌ Error en polling ${pollingAttempts}:`, error);
          // Continuar polling en caso de error de red temporal
        }
      });
    }, 5000); // Verificar cada 5 segundos
  }

  /**
   * Inicia el indicador de progreso del algoritmo
   * MODIFICADO: Ahora abre el modal dedicado de progreso
   */
  private startAlgorithmProgress(): void {
    console.log('🚀 Iniciando modal de progreso del algoritmo');
    
    // Resetear estado del modal
    this.resetProgressModalState();
    
    // Configurar estado inicial
    this.isAlgorithmRunning = true;
    this.elapsedTime = 0;
    this.algorithmProgress = '🔍 Iniciando algoritmo...';
    
    // Calcular tiempo estimado basado en número de estudiantes y complejidad
    const baseTime = 20; // 20 segundos base
    const studentFactor = Math.ceil(this.selectedStudents.length / 3) * 5; // 5 segundos por cada 3 estudiantes
    const restrictionsFactor = (this.restrictions.mustBeTogether.length + this.restrictions.mustNotBeTogether.length) * 3; // 3 segundos por restricción
    this.estimatedTime = baseTime + studentFactor + restrictionsFactor;
    
    console.log(`⏱️ Tiempo estimado: ${this.estimatedTime} segundos`);
    
    // NUEVO: Abrir el modal de progreso
    this.showProgressModal = true;
    
    // Actualizar progreso cada segundo
    this.algorithmTimer = setInterval(() => {
      this.elapsedTime++;
      this.updateAlgorithmProgress();
    }, 1000);
  }

  /**
   * Para el indicador de progreso del algoritmo
   * MODIFICADO: Configura el estado del modal correctamente
   */
  private stopAlgorithmProgress(success: boolean, errorMessage?: string): void {
    this.isAlgorithmRunning = false;
    
    if (this.algorithmTimer) {
      clearInterval(this.algorithmTimer);
      this.algorithmTimer = null;
    }
    
    // NUEVO: Configurar estado del modal
    this.algorithmCompleted = true;
    this.algorithmSuccess = success;
    
    if (success) {
      this.algorithmProgress = '🎉 ¡Equipos creados exitosamente!';
    } else {
      this.algorithmProgress = errorMessage || '❌ Error al crear equipos';
      this.algorithmErrorMessage = errorMessage || 'Error desconocido al crear equipos';
    }
  }

  /**
   * Actualiza el mensaje de progreso basado en tiempo transcurrido
   * MEJORADO: Fases más realistas del algoritmo
   */
  private updateAlgorithmProgress(): void {
    const progress = Math.min((this.elapsedTime / this.estimatedTime) * 100, 95);
    
    if (this.elapsedTime <= 5) {
      this.algorithmProgress = '🔍 Analizando perfiles BELBIN de estudiantes...';
    } else if (this.elapsedTime <= 10) {
      this.algorithmProgress = '⚙️ Aplicando restricciones de agrupación...';
    } else if (this.elapsedTime <= 15) {
      this.algorithmProgress = '🧠 Ejecutando algoritmo de optimización...';
    } else if (this.elapsedTime <= 25) {
      this.algorithmProgress = '🔄 Validando soluciones encontradas...';
    } else if (this.elapsedTime <= this.estimatedTime) {
      this.algorithmProgress = '✨ Finalizando formación de equipos...';
    } else {
      this.algorithmProgress = '🔄 Completando proceso y creando grupos...';
    }
  }

  /**
   * Obtiene el tiempo transcurrido en formato legible
   */
  getElapsedTime(): string {
    if (!this.isAlgorithmRunning) return '';
    
    return this.elapsedTime > 0 ? `${this.elapsedTime}s transcurridos` : 'Iniciando...';
  }

  /**
   * Genera un ID único para configuraciones
   */
  private generateUniqueId(): string {
    return `config_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * NUEVO: Métodos para el modal de progreso del algoritmo
   */

  /**
   * Cierra el modal de progreso cuando el algoritmo ha terminado
   */
  onProgressModalClose(): void {
    this.showProgressModal = false;
    
    // Si fue exitoso, emitir evento para actualizar los grupos
    if (this.algorithmSuccess) {
      console.log('✅ Algoritmo exitoso - limpiando estado automáticamente');
      
      // 1. Emitir evento para actualizar los grupos en el componente padre
      this.onRequestSent.emit(true);
      
      // 2. Limpiar automáticamente el estado del formulario
      this.resetFormStateAfterSuccess();
      
      console.log('🔄 Estado del formulario limpiado automáticamente');
    }
    
    // Resetear estado del modal
    this.resetProgressModalState();
  }

  /**
   * NUEVO: Limpia el estado del formulario después de un algoritmo exitoso
   */
  private resetFormStateAfterSuccess(): void {
    // Resetear formulario principal
    this.teamBuilderForm.reset();
    this.teamBuilderForm.patchValue({
      algorithm: this.questionnaires[0] || {}
    });
    
    // Limpiar estudiantes seleccionados
    this.selectedStudents = [];
    this.selectedRestrictionStudents = [];
    
    // Limpiar restricciones
    this.restrictions = {
      mustBeTogether: [],
      mustNotBeTogether: [],
      mustBeAGroup: []
    };
    
    // Limpiar configuraciones de grupos
    this.groupConfigurations = [];
    
    // Volver al primer paso del stepper
    this.active = 0;
    
    // Limpiar términos de búsqueda
    this.searchValue = undefined;
    this.searchValueRestricctions = undefined;
    
    console.log('🧹 Estado del formulario completamente limpiado');
  }

  /**
   * OBSOLETO: Cancela el algoritmo en ejecución
   * Ya no se permite cancelar el algoritmo - se ejecuta en segundo plano
   */
  onProgressModalCancel(): void {
    console.log('⚠️ Cancelación no permitida - el algoritmo se ejecuta automáticamente');
    
    // No hacer nada - la cancelación está deshabilitada
    // El algoritmo debe completarse en segundo plano
  }

  /**
   * Resetea el estado del modal de progreso
   */
  private resetProgressModalState(): void {
    this.algorithmCompleted = false;
    this.algorithmSuccess = false;
    this.algorithmsGroupsCreated = 0;
    this.algorithmErrorMessage = '';
    this.algorithmProgress = '';
    this.elapsedTime = 0;
  }

  // Métodos existentes mantenidos para compatibilidad
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

