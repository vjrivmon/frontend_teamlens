import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivitiesService } from '../../../../services/activities.service';
import { IGroup, IUser } from '../../../../models/models';

import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { CardModule } from 'primeng/card';

import { concatMap } from 'rxjs';

import { TeacherOnlyDirective } from '../../../../directives/teacher-only';
import { AuthService } from '../../../../services/auth.service';
@Component({
  selector: 'app-group-detail',
  standalone: true,
  imports: [CommonModule, ButtonModule, DialogModule, CardModule, TeacherOnlyDirective],
  templateUrl: './group-detail.component.html',
  styleUrl: './group-detail.component.css'
})
export class GroupDetailComponent {

  @Input('id') activityId!: string;
  @Input('group_id') groupId!: string;
  
  loggedUser: IUser | undefined = undefined;
  
  group: IGroup | undefined;

  activityStudents: IUser[] = [];
  activityGroups: IGroup[] = [];

  freeStudents: IUser[] = [];
  selectedStudents: IUser[] = [];

  addMembersDialogVisible: boolean = false; 

  selectedMember: IUser | undefined;

  constructor(private activitiesService: ActivitiesService, private authService: AuthService) { }


  ngOnInit() {

    this.authService.loggedUser.subscribe(
      loggedUser => {
        this.loggedUser = loggedUser
      }
    );
    
    console.log('ActivityDetailComponent initialized', this.groupId);

    if (!this.groupId || !this.activityId) {
      throw new Error('ID is required');
    }

    this.activitiesService.getGroupById(this.activityId, this.groupId).subscribe((data) => {
      this.group = data
      console.log('Group', this.group)
    })

    this.activitiesService.getStudentsByActivityById(this.activityId).pipe(
      concatMap(students => {
        this.activityStudents = students ?? []
        return this.activitiesService.getGroupsByActivityById(this.activityId);
      }),
      concatMap(groups => {
        return this.activityGroups = groups ?? [];
      })

    ).subscribe(() => {
      this.refreshFreeStudents();
    });

    // if (!this.group) {
    //   this.router.navigate(['/NotFound']);
    // }

    this.selectMember(this.group?.students[0]!) // Select the first member by default

  }

  selectMember(member: IUser) {
    this.selectedMember = member;
  }

  addMembers(users: IUser[]) {
    const userIds = users.map(u => u._id);
    this.activitiesService.addStudentToGroup(this.activityId, this.groupId, userIds).subscribe((data) => {
      this.group!.students.push(...data.members);
      this.addMembersDialogVisible = false;

      this.activityGroups.find(g => g._id === this.groupId)!.students = this.group!.students;
      this.refreshFreeStudents();
    });
  }

  deleteMember(member: IUser) {
    this.activitiesService.removeStudentFromGroup(this.activityId, this.groupId, member._id).subscribe(() => {
      this.group!.students = this.group?.students.filter((s) => s._id !== member._id) ?? [];
      // if(this.group.students.length === 0) {
      //   this.activitiesService.deleteGroupById(this.activityId, this.groupId).subscribe(() => {
      //     console.log('Group deleted')
      //   })
      // }
      this.activityGroups.find(g => g._id === this.groupId)!.students = this.group!.students;
      this.refreshFreeStudents();
    });
  }

  //

  refreshFreeStudents() {
    this.freeStudents = this.activityStudents.filter(student => !this.checkUserAlreadyInAGroup(student));
    this.selectedStudents = [];
  }

  checkUserAlreadyInAGroup(user: IUser): boolean {
    return this.activityGroups ? this.activityGroups.some(group => group.students.some(student => student._id === user._id)) : false;
  }

  selectUser(user: IUser): void {
    this.selectedStudents.push(user);
    this.freeStudents = this.freeStudents.filter(u => u._id !== user._id);
  }

  removeSelectedUser(user: IUser): void {
    this.freeStudents.push(user);
    this.selectedStudents = this.selectedStudents.filter(u => u._id !== user._id);
  }
}
