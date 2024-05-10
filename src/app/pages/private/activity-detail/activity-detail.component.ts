import { Component, Input, inject } from '@angular/core';
import { IActivity } from '../../../models/models';
import { ActivitiesService } from '../../../services/activities.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-activity-detail',
  standalone: true,
  imports: [],
  templateUrl: './activity-detail.component.html',
  styleUrl: './activity-detail.component.css'
})
export class ActivityDetailComponent {

  activity: IActivity | undefined;

  router = inject(Router);

  @Input('id') activityId!: string;

  constructor(private activitiesService: ActivitiesService) { }

  ngOnInit() {

    console.log('ActivityDetailComponent initialized', this.activityId);

    if (!this.activityId) {
      throw new Error('Activity ID is required');
    }

    this.activitiesService.getActivity(this.activityId).subscribe((data) => {
      this.activity = data
    })

    // if (!this.activity) {
    //   this.router.navigate(['/NotFound']);
    // }

  }

  addStudentsButton() {
    //open dialog?
    console.log('add students');
  }

  goCreateGroup() {
    this.router.navigateByUrl(`/activities/${this.activityId}/create-group`);
  }

  goGroupDetail(groupId: string) {
    this.router.navigateByUrl(`/activities/${this.activityId}/${groupId}`);
  }

}
