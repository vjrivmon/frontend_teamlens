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

import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { AddStudentsFormComponent } from '../components/add-students-form/add-students-form.component';
import { CreateGroupsAlgorithmFormComponent } from '../components/create-groups-algorithm-form/create-groups-algorithm-form.component';

import { TeacherOnlyDirective } from '../../../../directives/teacher-only';
import { StudentOnlyDirective } from '../../../../directives/student-only';


import { concatMap, retry } from 'rxjs';

import { CreateGroupComponent, IGroupCreatedEvent } from "../create-group/create-group.component";
import { QuestionnairesService } from '../../../../services/questionnaires.service';

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
    TooltipModule
  ]
})
export class ActivityDetailComponent {

  activity: IActivity | undefined;
  students: IUser[] = [];
  groups: IGroup[] = [];

  questionnaires: IQuestionnaire[] = [];
  questionnaireStats: IQuestionnaireStats[] = [];

  router = inject(Router);

  @Input('id') activityId!: string;

  addStudentDialogVisible: boolean = false;

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

  constructor(
    private activitiesService: ActivitiesService,
    private questionnairesService: QuestionnairesService,
    private confirmationService: ConfirmationService,
    private messageService: MessageService
  ) { }


  ngOnInit() {

    console.log('ActivityDetailComponent initialized', this.activityId);

    if (!this.activityId) {
      throw new Error('Activity ID is required');
    }

    this.activitiesService.getActivityById(this.activityId).pipe(

      concatMap(activity => {
        this.activity = activity;
        this.loadingStudentsTable = false;
        // console.log('activity', activity);
        this.groupsLocked = activity?.algorithmStatus == 'running';
        return this.activitiesService.getStudentsByActivityById(this.activity!._id);
      }),
      concatMap(students => {
        this.students = students ?? []
        return this.activitiesService.getGroupsByActivityById(this.activity!._id);
      }),
      concatMap(groups => {
        return this.groups = groups ?? [];
      })

    ).subscribe({
      next: (data: any) => {
        //console.log(data)
      },
      error: (error) => {
        //console.error('Error loading activity', error);
        if (!this.activity) {
          console.log('Activity not found', this.activityId);
          this.router.navigate(['/NotFound']);
        }

      }
    });

    this.questionnairesService.getQuestionnaires().subscribe((questionnaires) => {
      this.questionnaires = questionnaires || [];
    });

    // Cargar estadísticas de cuestionarios para esta actividad
    this.loadQuestionnaireStats();

  }

  addStudentsButton() {
    this.addStudentDialogVisible = true;
  }

  onAddStudents(emails: string[]) {
    if (emails.length > 0) {
      this.activitiesService.addStudentsToActivityByEmail(this.activity!._id, emails).pipe(
        concatMap(() => {
          return this.activitiesService.getStudentsByActivityById(this.activity!._id);
        })
      ).subscribe({
        next: (students) => {
          if (students) {
            this.students = students;
          }
        }
      });
    }
    this.addStudentDialogVisible = false;
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

  onAlgorithmRequestSent(result: boolean) {
    if (result) {
      this.groupsLocked = true;
      this.createAlgGroupsDialogVisible = false;
    }
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
    this.questionnairesService.getQuestionnaireStatsByActivity(this.activityId).subscribe({
      next: (stats) => {
        this.questionnaireStats = stats || [];
        console.log('📊 Estadísticas de cuestionarios cargadas:', this.questionnaireStats);
      },
      error: (error) => {
        console.error('❌ Error cargando estadísticas de cuestionarios:', error);
        this.questionnaireStats = [];
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

}
