import { Component, Input } from '@angular/core';
import { ActivitiesService } from '../../../services/activities.service';
import { Router } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { IActivity, IUser, TNewGroup } from '../../../models/models';


@Component({
  selector: 'app-create-group',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './create-group.component.html',
  styleUrl: './create-group.component.css'
})
export class CreateGroupComponent {

  activity: IActivity | undefined;

  @Input('id') activityId!: string;

  freeStudents: IUser[] = []; // Students that are not in any group

  selectedStudents: IUser[] = [];

  groupForm = this.formBuilder.group({
    name: ['', [Validators.required]]
  })

  constructor(private activitiesService: ActivitiesService, private router: Router, private formBuilder: FormBuilder) { }

  ngOnInit() {

    console.log('CreateGroupComponent initialized', this.activityId);

    if (!this.activityId) {
      this.router.navigate(['/NotFound']);
    }

    this.activitiesService.getActivity(this.activityId).subscribe((data) => {
      this.activity = data
      this.freeStudents = this.activity!.students.filter(student => !this.checkUserAlreadyInAGroup(student));
    })

  }

  checkUserAlreadyInAGroup(user: IUser): boolean {
    return this.activity!.groups.some(group => group.members?.some(member => member.id === user.id)) || false;
  }

  selectUser(user: IUser): void {
    this.selectedStudents.push(user);
    this.freeStudents = this.freeStudents.filter(user => user.id !== user.id);
  }

  removeSelectedUser(user: IUser): void {
    this.freeStudents.push(user);
    this.selectedStudents = this.selectedStudents.filter(user => user.id !== user.id);
  }

  onSubmit(): void {

    const { name } = this.groupForm.value;

    console.log(this.selectedStudents);

    if (!(this.selectedStudents.length > 0)) {
      alert('Select at least one student'); //replace
      return;
    }
    
    const group: TNewGroup = {
      name: name!,
      members: this.selectedStudents
    }

    this.activitiesService.createGroup(this.activity!, group);

    //if OK, navigate to activity detail
    this.router.navigateByUrl(`/activities/${this.activityId}`);


  }

}
