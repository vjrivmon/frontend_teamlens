import { Component, inject } from '@angular/core';
import { SlicePipe } from '@angular/common';

import { Router } from '@angular/router';
import { AuthService } from '../../../../services/auth.service';
import { ActivitiesService } from '../../../../services/activities.service';
import { QuestionnairesService } from '../../../../services/questionnaires.service';

import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ChipModule } from 'primeng/chip';
import { DividerModule } from 'primeng/divider';

import { CreateActivityComponent, IActivityCreatedEvent } from '../create-activity/create-activity.component';
import { QuestionnaireFormComponent } from "../components/questionnaire-form/questionnaire-form.component";

import { IActivity, IGroup, IQuestionnaire, IUser, TQuestionnaireResult } from '../../../../models/models';

import { TeacherOnlyDirective } from '../../../../directives/teacher-only';
import { StudentOnlyDirective } from '../../../../directives/student-only';


@Component({
    selector: 'app-dashboard',
    standalone: true,
    templateUrl: './dashboard.component.html',
    styleUrl: './dashboard.component.css',
    imports: [DividerModule, SlicePipe, ButtonModule, CardModule, DialogModule, ChipModule, CreateActivityComponent, TeacherOnlyDirective, StudentOnlyDirective, QuestionnaireFormComponent]
})
export class DashboardComponent {
   
  activities: IActivity[] = [];
  questionnaires: IQuestionnaire[] = [];
  studentGroups: { group: IGroup; activityTitle: string }[] = [];

  router = inject(Router);
  loggedUser: IUser | undefined;

  createActivityDialogVisible: boolean = false;

  constructor(private activitiesService: ActivitiesService, private questionnairesService: QuestionnairesService, private authService: AuthService) {
    this.loggedUser = this.authService.getUser();

    console.log('loggedUser', this.loggedUser);

    this.activitiesService.getActivitiesByUserId(this.loggedUser!._id).subscribe((activities) => {
      this.activities = activities;

      // Extract groups for students
      if (this.loggedUser?.role === 'student') {
        this.studentGroups = [];
        for (const activity of activities) {
          if (activity.groups) {
            for (const group of activity.groups) {
              // Check if current student is in this group
              const isInGroup = group.students?.some(s => s._id === this.loggedUser?._id);
              if (isInGroup) {
                this.studentGroups.push({ group, activityTitle: activity.title });
              }
            }
          }
        }
      }
    });

    this.questionnairesService.getQuestionnaires().subscribe((questionnaires) => {
      this.questionnaires  = questionnaires;
      console.log('questionnaires', questionnaires);
    });

    this.questionnairesService.getAskedQuestionnaires().subscribe((askedQuestionnaires: TQuestionnaireResult[]) => {
      if(!this.loggedUser) return;
      this.loggedUser!.askedQuestionnaires = askedQuestionnaires;
      authService.loggedUserSubject.next(this.loggedUser);
    });
    
  }

  goToActivityDetail(activityId: string) {
    this.router.navigateByUrl(`/activities/${activityId}`);
  }

  onCreateActivityButton() {
    this.createActivityDialogVisible = true;
  }

  onActivityCreated(event: IActivityCreatedEvent) {
    console.log('onActivityCreated', event.activity);
    if (event.ok) this.activities.push(event.activity);
    this.createActivityDialogVisible = !event.ok;

    this.goToActivityDetail(event.activity._id);
    
  }

  onAskQuestionnaireButton(questionnaire: IQuestionnaire) {
    this.router.navigateByUrl(`/questionnaire/${questionnaire._id}`);
  }

  hasAskedQuestionnaire(questionnaireId: string): TQuestionnaireResult | undefined {
    return this.loggedUser?.askedQuestionnaires?.find(q => q.questionnaire == questionnaireId)
  }

 

}
