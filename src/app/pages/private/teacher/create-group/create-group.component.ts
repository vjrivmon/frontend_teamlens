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

  groupForm = this.formBuilder.group({
    name: ['', [Validators.required]]
  })

  constructor(private activitiesService: ActivitiesService, private router: Router, private formBuilder: FormBuilder) { }

  ngOnChanges(changes: any) {
    this.freeStudents = this.students.filter(student => !this.checkUserAlreadyInAGroup(student));
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

    console.log(this.selectedStudents);

    if (this.selectedStudents.length < 0) {
      alert('Select at least one student'); //replace
      return;
    }

    const group: INewGroup = {
      name: name!,
      students: this.selectedStudents.map(student => student._id )
    }

    this.activitiesService.createGroup(this.activity!._id, { ...group }).subscribe({
      next: (data: any) => {
        this.groupForm.reset();
        this.onGroupCreated.emit({ ok: true, group: data.group });
        this.selectedStudents = [];
      },
      error: (error) => {
        console.error('Error creating group', error);
        alert('Error creating group');
      }
    });

  }

}
