import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IActivity, IGroup, IQuestionnaire, IUser, IQuestionnaireStats } from '../../../../models/models';
import { ActivitiesService } from '../../../../services/activities.service';
import { Router } from '@angular/router';

import { FormsModule } from '@angular/forms';

import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { TabViewModule } from 'primeng/tabview';
import { TagModule } from 'primeng/tag';
import { CardModule } from 'primeng/card';
import { BadgeModule } from 'primeng/badge';
import { FieldsetModule } from 'primeng/fieldset';
import { DividerModule } from 'primeng/divider';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { AddStudentsFormComponent } from '../components/add-students-form/add-students-form.component';
import { CreateGroupsAlgorithmFormComponent } from '../components/create-groups-algorithm-form/create-groups-algorithm-form.component';

import { TeacherOnlyDirective } from '../../../../directives/teacher-only';
import { StudentOnlyDirective } from '../../../../directives/student-only';
import { AuthService } from '../../../../services/auth.service';


import { concatMap, retry, catchError, finalize } from 'rxjs';
import { of, timer } from 'rxjs';

import { CreateGroupComponent, IGroupCreatedEvent } from "../create-group/create-group.component";
import { QuestionnairesService } from '../../../../services/questionnaires.service';

/**
 * Interface para manejo de estados de carga
 */
interface LoadingState {
  activity: boolean;
  students: boolean;
  groups: boolean;
  questionnaires: boolean;
  questionnaireStats: boolean;
  overall: boolean;
}

/**
 * Interface para manejo de errores
 */
interface ErrorState {
  activity: string | null;
  students: string | null;
  groups: string | null;
  questionnaires: string | null;
  general: string | null;
}

@Component({
  selector: 'app-activity-detail',
  standalone: true,
  templateUrl: './activity-detail.component.html',
  styleUrl: './activity-detail.component.css',
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    BadgeModule,
    ButtonModule,
    TableModule,
    TagModule,
    InputTextModule,
    CardModule,
    AddStudentsFormComponent,
    TeacherOnlyDirective,
    StudentOnlyDirective,
    TabViewModule,
    FieldsetModule,
    DividerModule,
    ConfirmDialogModule,
    CreateGroupComponent,
    CreateGroupsAlgorithmFormComponent,
    ToastModule,
    TooltipModule,
    SkeletonModule,
    ProgressSpinnerModule
  ]
})
export class ActivityDetailComponent {

  // === ESTADOS DE DATOS ===
  activity: IActivity | undefined;
  students: IUser[] = [];
  groups: IGroup[] = [];
  questionnaires: IQuestionnaire[] = [];
  questionnaireStats: IQuestionnaireStats[] = [];

  // === ESTADOS DE LOADING ===
  loadingState: LoadingState = {
    activity: true,
    students: true,
    groups: true,
    questionnaires: true,
    questionnaireStats: true,
    overall: true
  };

  // === ESTADOS DE ERROR ===
  errorState: ErrorState = {
    activity: null,
    students: null,
    groups: null,
    questionnaires: null,
    general: null
  };

  // === CONFIGURACIÓN DE REINTENTOS ===
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // ms

  router = inject(Router);

  @Input('id') activityId!: string;

  addStudentDialogVisible: boolean = false;
  
  // 🚀 NUEVO: Estado para confirmación de grupos
  confirmingGroups: boolean = false;

  loadingStudentsTable: boolean = true;
  studentsTableSearchValue: string | undefined;

  createGroupDialogVisible: boolean = false;
  createAlgGroupsDialogVisible: boolean = false;

  groupsLocked: boolean = false;

  // Variables para el drag & drop
  draggedStudent: IUser | null = null;
  draggedFromGroup: IGroup | null = null;
  isDragging: boolean = false;

  get activeMembers() {
    return this.students.filter(student => !student.invitationToken).length;
  }

  /**
   * Verifica si hay algún error crítico que impida la visualización
   */
  get hasCriticalError(): boolean {
    return !!(this.errorState.activity || this.errorState.general);
  }

  /**
   * Verifica si los datos principales están cargados
   */
  get isMainDataLoaded(): boolean {
    return !this.loadingState.activity && !this.loadingState.students && !this.loadingState.groups;
  }

  /**
   * Verifica si se debe mostrar el skeleton loader
   */
  get shouldShowSkeleton(): boolean {
    return this.loadingState.overall || this.loadingState.activity;
  }

  constructor(
    private activitiesService: ActivitiesService,
    private questionnairesService: QuestionnairesService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService,
    private authService: AuthService
  ) { }

  ngOnInit() {
    console.log('🚀 [ActivityDetail] Inicializando componente para actividad:', this.activityId);

    // Validación temprana del ID de actividad
    if (!this.activityId) {
      this.handleCriticalError('ID de actividad no proporcionado');
      return;
    }

    // Inicializar carga de datos con manejo robusto de errores
    this.initializeDataLoading();
  }

  /**
   * Inicializa la carga de datos con manejo de errores y reintentos
   */
  private initializeDataLoading(): void {
    console.log('📡 [ActivityDetail] Iniciando carga de datos...');
    
    // Resetear estados
    this.resetErrorStates();
    
    // Cargar datos principales de forma secuencial para mejor UX
    this.loadActivityData()
      .then(() => this.loadStudentsData())
      .then(() => this.loadGroupsData())
      .then(() => this.loadQuestionnairesData())
      .then(() => this.loadQuestionnaireStats())
      .catch((error) => {
        console.error('❌ [ActivityDetail] Error en carga de datos:', error);
        this.handleCriticalError('Error cargando datos de la actividad');
      })
      .finally(() => {
        this.loadingState.overall = false;
        console.log('✅ [ActivityDetail] Carga de datos completada');
      });
  }

  /**
   * Carga los datos de la actividad con retry automático
   */
  private loadActivityData(): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('📋 [ActivityDetail] Cargando datos de actividad...');
      
      this.loadingState.activity = true;
      this.errorState.activity = null;

      this.activitiesService.getActivityById(this.activityId)
        .pipe(
          retry(this.maxRetries),
          catchError((error) => {
            console.error('❌ [ActivityDetail] Error cargando actividad:', error);
            this.errorState.activity = 'Error cargando información de la actividad';
            return of(undefined);
          }),
          finalize(() => {
            this.loadingState.activity = false;
          })
        )
        .subscribe({
          next: (activity) => {
            if (activity) {
              this.activity = activity;
              this.groupsLocked = activity.algorithmStatus === 'running';
              console.log('✅ [ActivityDetail] Actividad cargada:', activity.title);
              resolve();
            } else {
              this.handleNotFound();
              reject(new Error('Actividad no encontrada'));
            }
          },
          error: (error) => {
            console.error('❌ [ActivityDetail] Error final cargando actividad:', error);
            reject(error);
          }
        });
    });
  }

  /**
   * Carga los datos de estudiantes
   */
  loadStudentsData(): Promise<void> {
    return new Promise((resolve) => {
      console.log('👥 [ActivityDetail] Cargando estudiantes...');
      
      this.loadingState.students = true;
      this.errorState.students = null;

      this.activitiesService.getStudentsByActivityById(this.activityId)
        .pipe(
          retry(this.maxRetries),
          catchError((error) => {
            console.error('❌ [ActivityDetail] Error cargando estudiantes:', error);
            this.errorState.students = 'Error cargando estudiantes';
            return of([]);
          }),
          finalize(() => {
            this.loadingState.students = false;
            this.loadingStudentsTable = false;
          })
        )
        .subscribe({
          next: (students) => {
            this.students = students || [];
            console.log(`✅ [ActivityDetail] ${this.students.length} estudiantes cargados`);
            resolve();
          }
        });
    });
  }

  /**
   * Carga los datos de grupos
   */
  loadGroupsData(): Promise<void> {
    return new Promise((resolve) => {
      console.log('👨‍👩‍👧‍👦 [ActivityDetail] Cargando grupos...');
      
      this.loadingState.groups = true;
      this.errorState.groups = null;

      this.activitiesService.getGroupsByActivityById(this.activityId)
        .pipe(
          retry(this.maxRetries),
          catchError((error) => {
            console.error('❌ [ActivityDetail] Error cargando grupos:', error);
            this.errorState.groups = 'Error cargando grupos';
            return of([]);
          }),
          finalize(() => {
            this.loadingState.groups = false;
          })
        )
        .subscribe({
          next: (groups) => {
            this.groups = groups || [];
            console.log(`✅ [ActivityDetail] ${this.groups.length} grupos cargados`);
            resolve();
          }
        });
    });
  }

  /**
   * Carga los cuestionarios disponibles
   */
  loadQuestionnairesData(): Promise<void> {
    return new Promise((resolve) => {
      console.log('📝 [ActivityDetail] Cargando cuestionarios...');
      
      this.loadingState.questionnaires = true;
      this.errorState.questionnaires = null;

      this.questionnairesService.getQuestionnaires()
        .pipe(
          retry(this.maxRetries),
          catchError((error) => {
            console.error('❌ [ActivityDetail] Error cargando cuestionarios:', error);
            this.errorState.questionnaires = 'Error cargando cuestionarios';
            return of([]);
          }),
          finalize(() => {
            this.loadingState.questionnaires = false;
          })
        )
        .subscribe({
          next: (questionnaires) => {
            this.questionnaires = questionnaires || [];
            console.log(`✅ [ActivityDetail] ${this.questionnaires.length} cuestionarios cargados`);
            resolve();
          }
        });
    });
  }

  /**
   * Maneja errores críticos que impiden la funcionalidad
   */
  private handleCriticalError(message: string): void {
    console.error('💥 [ActivityDetail] Error crítico:', message);
    
    this.errorState.general = message;
    this.loadingState.overall = false;
    
    this.messageService.add({
      severity: 'error',
      summary: 'Error Crítico',
      detail: message,
      life: 8000
    });
  }

  /**
   * Maneja el caso de actividad no encontrada
   */
  private handleNotFound(): void {
    console.log('🔍 [ActivityDetail] Actividad no encontrada:', this.activityId);
    
    this.messageService.add({
      severity: 'warn',
      summary: 'Actividad No Encontrada',
      detail: 'La actividad solicitada no existe o no tienes permisos para verla',
      life: 5000
    });
    
    // Navegar después de un breve delay para que el usuario vea el mensaje
    timer(2000).subscribe(() => {
      this.router.navigate(['/dashboard']);
    });
  }

  /**
   * Resetea todos los estados de error
   */
  private resetErrorStates(): void {
    this.errorState = {
      activity: null,
      students: null,
      groups: null,
      questionnaires: null,
      general: null
    };
  }

  /**
   * Reinicia la carga de datos (útil para botón de reintento)
   */
  retryDataLoading(): void {
    console.log('🔄 [ActivityDetail] Reintentando carga de datos...');
    
    this.loadingState.overall = true;
    this.initializeDataLoading();
  }

  addStudentsButton() {
    this.addStudentDialogVisible = true;
  }

  onAddStudents(emails: string[]) {
    if (emails.length > 0) {
      console.log(`📧 [ActivityDetail] Enviando invitaciones a ${emails.length} estudiantes:`, emails);
      
      this.activitiesService.addStudentsToActivityByEmail(this.activity!._id, emails).pipe(
        concatMap(() => {
          console.log(`✅ [ActivityDetail] Estudiantes añadidos exitosamente, recargando lista...`);
          return this.activitiesService.getStudentsByActivityById(this.activity!._id);
        }),
        catchError((error) => {
          console.error('❌ [ActivityDetail] Error añadiendo estudiantes:', error);
          
          // Mostrar error específico al usuario
          let errorMessage = 'Error añadiendo estudiantes.';
          
          if (error.status === 400) {
            errorMessage = 'Error en los datos enviados. Verifica que los emails sean válidos.';
          } else if (error.status === 401) {
            errorMessage = 'No tienes permisos para añadir estudiantes.';
          } else if (error.status === 404) {
            errorMessage = 'Actividad no encontrada.';
          } else if (error.status === 500) {
            errorMessage = 'Error del servidor. Es posible que los emails no se hayan enviado correctamente.';
          } else if (error.error?.message) {
            errorMessage = `Error: ${error.error.message}`;
          }
          
          // Mostrar toast de error
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage,
            life: 5000
          });
          
          // No cerrar el modal para que el usuario pueda intentar de nuevo
          return of(null);
        })
      ).subscribe({
        next: (students) => {
          if (students) {
            this.students = students;
            console.log(`✅ [ActivityDetail] Lista de estudiantes actualizada: ${students.length} estudiantes`);
            
            // Mostrar mensaje de éxito
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: `${emails.length} estudiante(s) añadido(s) exitosamente. Los emails de invitación han sido enviados.`,
              life: 4000
            });
            
            // Solo cerrar el modal si todo fue exitoso
            this.addStudentDialogVisible = false;
          }
          // Si students es null (error), el modal permanece abierto
        },
        error: (error) => {
          // Manejo adicional de errores que no fueron capturados por catchError
          console.error('❌ [ActivityDetail] Error no capturado:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error Inesperado',
            detail: 'Ocurrió un error inesperado. Inténtalo de nuevo.',
            life: 5000
          });
        }
      });
    } else {
      // Si no hay emails, simplemente cerrar el modal
      this.addStudentDialogVisible = false;
    }
  }

  goGroupDetail(groupId: string) {
    this.router.navigateByUrl(`/activities/${this.activityId}/${groupId}`);
  }

  onCreateGroupButton() {
    this.createGroupDialogVisible = true;
  }

  onCreateAlgGroupsButton() {
    this.createAlgGroupsDialogVisible = true;
  }

  /**
   * CORREGIDO: Maneja la finalización del algoritmo con actualización automática
   * @param result Resultado del algoritmo (true si fue exitoso)
   */
  onAlgorithmRequestSent(result: boolean) {
    console.log('🎯 [ActivityDetail] Algoritmo finalizado:', { result });
    
    if (result) {
      console.log('✅ [ActivityDetail] Algoritmo exitoso, actualizando grupos...');
      
      // Cerrar el modal inmediatamente para mejor UX
      this.createAlgGroupsDialogVisible = false;
      
      // Mostrar notificación de finalización
      this.messageService.add({
        severity: 'success',
        summary: '🎉 Algoritmo Completado',
        detail: 'Los grupos han sido creados exitosamente. Actualizando interfaz...',
        life: 4000
      });
      
      // CRÍTICO: Recargar grupos desde el backend
      this.reloadGroupsFromBackend();
      
      // Opcional: Bloquear grupos después de la actualización (comentado para mantener funcionalidad)
      // this.groupsLocked = true;
      
    } else {
      console.log('❌ [ActivityDetail] Algoritmo falló');
      this.messageService.add({
        severity: 'error',
        summary: 'Error en Algoritmo',
        detail: 'Hubo un problema creando los grupos. Inténtalo de nuevo.',
        life: 5000
      });
    }
  }

  /**
   * NUEVO: Recarga la lista de grupos desde el backend
   * Esencial para mostrar los grupos creados por el algoritmo
   */
  private reloadGroupsFromBackend(): void {
    console.log('🔄 [ActivityDetail] Recargando grupos desde el backend...');
    
    this.activitiesService.getGroupsByActivityById(this.activityId).subscribe({
      next: (groups: IGroup[] | undefined) => {
        console.log('✅ [ActivityDetail] Grupos recargados exitosamente:', groups);
        
        // Actualizar la lista de grupos en la interfaz, manejando undefined
        this.groups = groups || [];
        
        // Mostrar mensaje informativo sobre los grupos creados
        if (groups && groups.length > 0) {
          this.messageService.add({
            severity: 'info',
            summary: '📋 Grupos Actualizados',
            detail: `Se muestran ${groups.length} grupos en la interfaz`,
            life: 3000
          });
        } else {
          console.log('ℹ️ [ActivityDetail] No hay grupos disponibles o lista vacía');
        }
        
        console.log('🎊 [ActivityDetail] Interfaz actualizada con nuevos grupos');
      },
      error: (error: any) => {
        console.error('❌ [ActivityDetail] Error recargando grupos:', error);
        
        this.messageService.add({
          severity: 'warn',
          summary: 'Error Actualizando',
          detail: 'Los grupos se crearon pero hay un problema mostrándolos. Recarga la página.',
          life: 6000
        });
      }
    });
  }

  onGroupCreated(event: IGroupCreatedEvent) {
    console.log('onGroupCreated', event);
    if (event.ok) {
      this.groups.push(event.group);
      event.group.students.forEach(member => {
        const s = this.students.find(student => student._id === member._id)
        s?.groups?.push(event.group);
        console.log('s', s);
      })
      this.createGroupDialogVisible = !event.ok;
    }
  }

  /**
   * Envía un cuestionario a todos los estudiantes de la actividad que aún no lo han respondido
   * @param questionnaireId ID del cuestionario a enviar
   */
  onSendQuestionnaireToStudents(questionnaireId: string) {
    console.log('📧 Enviando cuestionario a estudiantes...', { activityId: this.activityId, questionnaireId });
    
    this.activitiesService.sendQuestionnaireToStudents(this.activityId, questionnaireId).subscribe({
      next: (response) => {
        console.log('✅ Cuestionario enviado exitosamente:', response);
        this.messageService.add({ 
          severity: 'success', 
          summary: 'Cuestionario Enviado', 
          detail: 'El cuestionario ha sido enviado a todos los estudiantes que aún no lo han respondido',
          life: 5000 
        });
        
        // Recargar estadísticas después de enviar el cuestionario
        this.loadQuestionnaireStats();
      },
      error: (error) => {
        console.error('❌ Error enviando cuestionario:', error);
        this.messageService.add({ 
          severity: 'error', 
          summary: 'Error', 
          detail: 'No se pudo enviar el cuestionario. Inténtalo de nuevo.',
          life: 5000 
        });
      }
    });
  }

  deleteGroup(groupId: string) {
    this.activitiesService.deleteGroupById(this.activityId, groupId).subscribe({
      next: () => {
        this.groups = this.groups.filter((group) => group._id !== groupId);
      },
      error: (err) => {
        console.error('Error deleting group', err);
      }
    });
  }

  deleteActivity(activityId: string | undefined) {

    if (!activityId) {
      return;
    }

    this.activitiesService.deleteActivityById(activityId).subscribe({
      next: () => {
        this.router.navigateByUrl('/dashboard');
      },
      error: (err) => {
        console.error('Error deleting activity', err);
      }
    });
  }

  confirmDeleteActivity() {
    this.confirmationService.confirm({
      key: 'dd',
      header: 'Are you sure?',
      message: 'This will delete all information related with this activity, including groups!',
      accept: () => {
        this.deleteActivity(this.activityId);
        this.messageService.add({ severity: 'error', summary: 'Deleted', detail: 'Activity deleted', life: 3000 });
      },
      reject: () => {
        //
      }
    });
  }

  confirmDeleteGroup(groupId: string) {
    this.confirmationService.confirm({
      key: 'dd',
      header: 'Are you sure?',
      message: 'This will delete all information related with this group.',
      accept: () => {
        this.deleteGroup(groupId);
        this.messageService.add({ severity: 'error', summary: 'Deleted', detail: 'Group deleted', life: 3000 });
      },
      reject: () => {
        //
      }
    });
  }

  // ==================== FUNCIONALIDAD DRAG & DROP ====================

  /**
   * Obtiene estudiantes que no están asignados a ningún grupo
   */
  getUnassignedStudents(): IUser[] {
    return this.students.filter(student => {
      return !this.groups.some(group => 
        group.students.some(groupStudent => groupStudent._id === student._id)
      );
    });
  }

  /**
   * Obtiene el número total de estudiantes asignados a grupos
   */
  getTotalAssignedStudents(): number {
    return this.students.length - this.getUnassignedStudents().length;
  }

  /**
   * Obtiene la inicial de un estudiante para el avatar
   */
  getStudentInitial(student: IUser): string {
    if (student.name && student.name.trim()) {
      return student.name.charAt(0).toUpperCase();
    }
    if (student.email) {
      return student.email.charAt(0).toUpperCase();
    }
    return 'U';
  }

  /**
   * Remueve rápidamente un estudiante de un grupo
   */
  quickRemoveStudent(student: IUser, fromGroup: IGroup): void {
    console.log('⚡ Eliminación rápida:', { student: student.name, group: fromGroup.name });

    // Mostrar confirmación para prevenir eliminaciones accidentales
    this.confirmationService.confirm({
      key: 'dd',
      header: '¿Eliminar estudiante?',
      message: `¿Estás seguro de que quieres eliminar a ${student.name || student.email} del grupo ${fromGroup.name}?`,
      accept: () => {
        this.removeStudentFromGroup(student, fromGroup);
      },
      reject: () => {
        // No hacer nada
      }
    });
  }

  /**
   * Inicia el arrastre de un estudiante
   */
  onDragStart(event: DragEvent, student: IUser, fromGroup: IGroup | null) {
    console.log('🎯 Iniciando drag:', { student: student.name, fromGroup: fromGroup?.name });
    
    // Resetear estado previo por si acaso
    this.resetDragState();
    
    this.draggedStudent = student;
    this.draggedFromGroup = fromGroup;
    this.isDragging = true;
    
    // Configurar datos de transferencia
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', student._id);
    }
    
    // Añadir clase visual al elemento arrastrado
    const target = event.target as HTMLElement;
    setTimeout(() => {
      target.classList.add('dragging');
    }, 0);
  }

  /**
   * Finaliza el arrastre
   */
  onDragEnd(event: DragEvent) {
    console.log('🏁 Finalizando drag');
    
    // Limpiar clases visuales del elemento arrastrado
    const target = event.target as HTMLElement;
    target.classList.remove('dragging');
    
    // Limpiar todas las clases de drop zones
    setTimeout(() => {
      document.querySelectorAll('.drag-over').forEach(el => {
        el.classList.remove('drag-over');
      });
      
      // Resetear estado después de un pequeño delay para evitar conflictos
      this.resetDragState();
    }, 100);
  }

  /**
   * Permite el drop en una zona válida
   */
  onDragOver(event: DragEvent) {
    if (this.isDragging && this.draggedStudent) {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = 'move';
      }
    }
  }

  /**
   * Visual feedback al entrar en zona de drop
   */
  onDragEnter(event: DragEvent) {
    if (this.isDragging && this.draggedStudent) {
      event.preventDefault();
      const target = event.currentTarget as HTMLElement;
      if (target) {
        target.classList.add('drag-over');
      }
    }
  }

  /**
   * Remueve visual feedback al salir de zona de drop
   */
  onDragLeave(event: DragEvent) {
    const target = event.currentTarget as HTMLElement;
    const relatedTarget = event.relatedTarget as Node;
    
    // Solo eliminar si realmente salimos del elemento (no de un hijo)
    if (target && relatedTarget && !target.contains(relatedTarget)) {
      target.classList.remove('drag-over');
    }
  }

  /**
   * Maneja el drop de un estudiante en un grupo
   */
  onDrop(event: DragEvent, targetGroup: IGroup) {
    event.preventDefault();
    
    if (!this.draggedStudent || !this.isDragging) {
      console.error('❌ No hay estudiante siendo arrastrado o estado inválido');
      this.resetDragState();
      return;
    }

    console.log('📍 Drop en grupo:', { 
      student: this.draggedStudent.name, 
      targetGroup: targetGroup.name,
      fromGroup: this.draggedFromGroup?.name || 'Sin asignar'
    });

    // Limpiar clases visuales inmediatamente
    const target = event.currentTarget as HTMLElement;
    if (target) {
      target.classList.remove('drag-over');
    }

    // No hacer nada si se suelta en el mismo grupo
    if (this.draggedFromGroup && this.draggedFromGroup._id === targetGroup._id) {
      console.log('⏭️  Mismo grupo, no se hace nada');
      this.resetDragState();
      return;
    }

    // Guardar referencias antes de resetear el estado
    const studentToMove = this.draggedStudent;
    const fromGroup = this.draggedFromGroup;
    
    // Resetear estado inmediatamente para evitar interferencias
    this.resetDragState();
    
    // Mover el estudiante
    this.moveStudentToGroup(studentToMove, fromGroup, targetGroup);
  }

  /**
   * Maneja el drop de un estudiante en la zona de "sin asignar"
   */
  onDropToUnassigned(event: DragEvent) {
    event.preventDefault();
    
    if (!this.draggedStudent || !this.draggedFromGroup || !this.isDragging) {
      console.error('❌ No hay estudiante válido siendo arrastrado o ya está sin asignar');
      this.resetDragState();
      return;
    }

    console.log('📍 Drop en zona sin asignar:', { 
      student: this.draggedStudent.name, 
      fromGroup: this.draggedFromGroup.name
    });

    // Limpiar clases visuales inmediatamente
    const target = event.currentTarget as HTMLElement;
    if (target) {
      target.classList.remove('drag-over');
    }

    // Guardar referencias antes de resetear el estado
    const studentToRemove = this.draggedStudent;
    const fromGroup = this.draggedFromGroup;
    
    // Resetear estado inmediatamente
    this.resetDragState();
    
    // Eliminar del grupo
    this.removeStudentFromGroup(studentToRemove, fromGroup);
  }

  /**
   * Mueve un estudiante a un grupo específico
   */
  private moveStudentToGroup(student: IUser, fromGroup: IGroup | null, toGroup: IGroup) {
    console.log('🔄 Moviendo estudiante:', { 
      student: student.name, 
      from: fromGroup?.name || 'Sin asignar', 
      to: toGroup.name 
    });

    // Actualizar en backend
    this.activitiesService.addStudentToGroup(this.activityId, toGroup._id, [student._id]).subscribe({
      next: (response) => {
        console.log('✅ Estudiante movido exitosamente en backend:', response);
        
        // Actualizar UI: Eliminar del grupo anterior si existía
        if (fromGroup) {
          fromGroup.students = fromGroup.students.filter(s => s._id !== student._id);
        }
        
        // Actualizar UI: añadir al nuevo grupo si no está ya
        if (!toGroup.students.some(s => s._id === student._id)) {
          toGroup.students.push(student);
        }

        // Mostrar notificación de éxito
        this.messageService.add({
          severity: 'success',
          summary: 'Estudiante Movido',
          detail: `${student.name || student.email} ha sido movido a ${toGroup.name}`,
          life: 3000
        });
      },
      error: (error) => {
        console.error('❌ Error moviendo estudiante:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo mover el estudiante. Inténtalo de nuevo.',
          life: 3000
        });
      }
    });
  }

  /**
   * Remueve un estudiante de un grupo
   */
  private removeStudentFromGroup(student: IUser, fromGroup: IGroup) {
    console.log('➖ Removiendo estudiante del grupo:', { 
      student: student.name, 
      group: fromGroup.name 
    });

    // Actualizar en backend
    this.activitiesService.removeStudentFromGroup(this.activityId, fromGroup._id, student._id).subscribe({
      next: (response) => {
        console.log('✅ Estudiante removido exitosamente en backend:', response);
        
        // Actualizar UI
        fromGroup.students = fromGroup.students.filter(s => s._id !== student._id);

        // Mostrar notificación de éxito
        this.messageService.add({
          severity: 'info',
          summary: 'Estudiante Removido',
          detail: `${student.name || student.email} ha sido removido de ${fromGroup.name}`,
          life: 3000
        });
      },
      error: (error) => {
        console.error('❌ Error removiendo estudiante:', error);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo eliminar el estudiante. Inténtalo de nuevo.',
          life: 3000
        });
      }
    });
  }

  /**
   * Resetea el estado del drag & drop
   */
  private resetDragState() {
    this.draggedStudent = null;
    this.draggedFromGroup = null;
    this.isDragging = false;
  }

  /**
   * Carga las estadísticas de completitud de cuestionarios para la actividad actual
   */
  private loadQuestionnaireStats() {
    this.loadingState.questionnaireStats = true;
    
    this.questionnairesService.getQuestionnaireStatsByActivity(this.activityId).subscribe({
      next: (stats) => {
        this.questionnaireStats = stats || [];
        console.log('📊 Estadísticas de cuestionarios cargadas:', this.questionnaireStats);
      },
      error: (error) => {
        console.error('❌ Error cargando estadísticas de cuestionarios:', error);
        this.questionnaireStats = [];
      },
      complete: () => {
        this.loadingState.questionnaireStats = false;
      }
    });
  }

  /**
   * Obtiene las estadísticas de un cuestionario específico
   * @param questionnaireId ID del cuestionario
   * @returns Estadísticas del cuestionario o undefined si no se encuentra
   */
  getQuestionnaireStats(questionnaireId: string): IQuestionnaireStats | undefined {
    return this.questionnaireStats.find(stat => stat.questionnaireId === questionnaireId);
  }

  /**
   * Verifica si el usuario actual es un teacher
   * @returns true si el usuario es teacher, false en caso contrario
   */
  isTeacher(): boolean {
    const user = this.authService.getUser();
    return user?.role === 'teacher';
  }

  // 🚀 NUEVAS FUNCIONES: Gestión de grupos draft/confirmed

  /**
   * Verifica si hay grupos en estado draft
   */
  hasDraftGroups(): boolean {
    return this.groups.some(group => group.status === 'draft');
  }

  /**
   * Cuenta los grupos en estado draft
   */
  getDraftGroupsCount(): number {
    return this.groups.filter(group => group.status === 'draft').length;
  }

  /**
   * Confirma todos los grupos draft y envía notificaciones
   */
  onConfirmGroupsButton(): void {
    console.log('🚀 [ActivityDetail] Iniciando confirmación de grupos...');
    
    if (!this.hasDraftGroups()) {
      console.warn('⚠️ [ActivityDetail] No hay grupos draft para confirmar');
      return;
    }

    this.confirmingGroups = true;

    // Obtener IDs de grupos draft
    const draftGroupIds = this.groups
      .filter(group => group.status === 'draft')
      .map(group => group._id);

    console.log(`✅ [ActivityDetail] Confirmando ${draftGroupIds.length} grupos draft`);

    this.activitiesService.confirmGroups(this.activityId, draftGroupIds).subscribe({
      next: (response) => {
        console.log('🎉 [ActivityDetail] Grupos confirmados exitosamente:', response);
        
        this.messageService.add({
          severity: 'success',
          summary: '✅ Grupos Confirmados',
          detail: `Se confirmaron ${response.data.confirmedCount} grupos y se notificó a ${response.data.notifiedStudents} estudiantes.`,
          life: 6000
        });

        // Actualizar estado local de los grupos
        this.groups.forEach(group => {
          if (group.status === 'draft') {
            group.status = 'confirmed';
            group.confirmedAt = new Date().toISOString();
          }
        });

        this.confirmingGroups = false;
      },
      error: (error) => {
        console.error('❌ [ActivityDetail] Error confirmando grupos:', error);
        
        this.messageService.add({
          severity: 'error',
          summary: '❌ Error Confirmando',
          detail: 'Hubo un problema confirmando los grupos. Inténtalo de nuevo.',
          life: 6000
        });

        this.confirmingGroups = false;
      }
    });
  }

}
