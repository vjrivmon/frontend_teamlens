import { Component, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IActivity, IGroup, IQuestionnaire, IUser } from '../../../../models/models';
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
    CreateGroupsAlgorithmFormComponent
  ]
})
export class ActivityDetailComponent {

  activity: IActivity | undefined;
  students: IUser[] = [];
  groups: IGroup[] = [];

  questionnaires: IQuestionnaire[] = [];

  router = inject(Router);

  @Input('id') activityId!: string;

  addStudentDialogVisible: boolean = false;

  loadingStudentsTable: boolean = true;
  studentsTableSearchValue: string | undefined;

  createGroupDialogVisible: boolean = false;
  createAlgGroupsDialogVisible: boolean = false;

  groupsLocked: boolean = false;

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
      this.questionnaires = questionnaires;
    });

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



}
