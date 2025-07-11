import { Component, EventEmitter, Input, Output, SimpleChange } from '@angular/core';
import { ActivitiesService } from '../../../../services/activities.service';

import { Router } from '@angular/router';

import { FormBuilder, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { CardModule } from 'primeng/card';

import { IActivity, IGroup, IUser, INewGroup } from '../../../../models/models';

export interface IGroupCreatedEvent {
  ok: boolean;
  group: IGroup;
}

@Component({
  selector: 'app-create-group',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, InputTextareaModule, CardModule],
  templateUrl: './create-group.component.html',
  styleUrl: './create-group.component.css'
})
export class CreateGroupComponent {

  @Output() onGroupCreated = new EventEmitter<IGroupCreatedEvent>();

  @Input('activity') activity: IActivity | undefined;
  @Input('groups') groups: IGroup[] = [];
  @Input('students') students: IUser[] = [];

  freeStudents: IUser[] = []; // Students that are not in any group
  selectedStudents: IUser[] = [];
  isSubmitting = false; // Estado de envío del formulario

  groupForm = this.formBuilder.group({
    name: ['', [Validators.required]]
  })

  constructor(private activitiesService: ActivitiesService, private router: Router, private formBuilder: FormBuilder) { }

  ngOnChanges(changes: any) {
    this.freeStudents = this.students.filter(student => !this.checkUserAlreadyInAGroup(student));
  }

  /**
   * Obtiene la inicial del nombre del estudiante para mostrar en el avatar
   * @param student - Estudiante del cual obtener la inicial
   * @returns Inicial del nombre o primera letra del email si no hay nombre
   */
  getStudentInitial(student: IUser): string {
    if (student.name && student.name.trim()) {
      return student.name.charAt(0).toUpperCase();
    }
    return student.email.charAt(0).toUpperCase();
  }

  checkUserAlreadyInAGroup(user: IUser): boolean {
    return this.groups ? this.groups.some(group => group.students.some(student => student._id === user._id)) : false;
  }

  selectUser(user: IUser): void {
    this.selectedStudents.push(user);
    this.freeStudents = this.freeStudents.filter(u => u._id !== user._id);
  }

  removeSelectedUser(user: IUser): void {
    this.freeStudents.push(user);
    this.selectedStudents = this.selectedStudents.filter(u => u._id !== user._id);
  }

  onSubmit(): void {
    const { name } = this.groupForm.value;

    // Validación mejorada
    if (this.selectedStudents.length === 0) {
      // Aquí podrías mostrar una notificación toast en lugar de alert
      alert('Selecciona al menos un estudiante para el grupo');
      return;
    }

    if (!name || name.trim() === '') {
      alert('El nombre del grupo es obligatorio');
      return;
    }

    this.isSubmitting = true;

    const group: INewGroup = {
      name: name.trim(),
      students: this.selectedStudents.map(student => student._id )
    }

    this.activitiesService.createGroup(this.activity!._id, { ...group }).subscribe({
      next: (data: any) => {
        this.groupForm.reset();
        this.onGroupCreated.emit({ ok: true, group: data.group });
        this.selectedStudents = [];
        this.isSubmitting = false;
      },
      error: (error) => {
        console.error('Error creating group', error);
        alert('Error al crear el grupo. Por favor, inténtalo de nuevo.');
        this.isSubmitting = false;
      }
    });
  }

}
