import { Component, inject } from '@angular/core';
import { ActivitiesService } from '../../../../services/activities.service';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { IActivity } from '../../../../models/models';

@Component({
  selector: 'app-activities-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './activities-list.component.html',
  styleUrl: './activities-list.component.css',
  providers: [ActivitiesService]
})
export class ActivitiesListComponent {

  activities = this.activitiesService.getActivities();

  router = inject(Router);

  constructor(private activitiesService: ActivitiesService) { }


  goToActivityDetail(activityId: string) {
    this.router.navigateByUrl(`/activities/${activityId}`);
  }

  goCreateActivity() {
    this.router.navigateByUrl('/activities/new');
  }


}
