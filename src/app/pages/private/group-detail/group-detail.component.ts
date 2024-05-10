import { Component, Input } from '@angular/core';
import { ActivitiesService } from '../../../services/activities.service';
import { IGroup, IUser } from '../../../models/models';

@Component({
  selector: 'app-group-detail',
  standalone: true,
  imports: [],
  templateUrl: './group-detail.component.html',
  styleUrl: './group-detail.component.css'
})
export class GroupDetailComponent {

  group: IGroup | undefined;

  @Input('id') activityId!: string;
  @Input('group_id') groupId!: string;

  selectedMember: IUser | undefined;

  constructor(private activitiesService: ActivitiesService) { }

  ngOnInit() {

    console.log('ActivityDetailComponent initialized', this.groupId);

    if (!this.groupId || !this.activityId) {
      throw new Error('ID is required');
    }  

    this.activitiesService.getGroup(this.activityId, this.groupId).subscribe((data) => {
      this.group = data
    })

    // if (!this.group) {
    //   this.router.navigate(['/NotFound']);
    // }

    this.selectMember(this.group?.members[0]!) // Select the first member by default

  }

  selectMember(member: IUser) {
    this.selectedMember = member;
  }

}
