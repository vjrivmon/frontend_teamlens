import { Component } from '@angular/core';
import { ActivitiesService } from '../../../services/activities.service';
import { Router } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';
import { TNewActivity } from '../../../models/models';
import { AuthService } from '../../../services/auth.service';


@Component({
  selector: 'app-create-activity',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './create-activity.component.html',
  styleUrl: './create-activity.component.css'
})
export class CreateActivityComponent {

  activityForm = this.formBuilder.group({
    title: ['', [Validators.required]],
    description: ['', [Validators.required]]
  })

  constructor(private authService: AuthService, private activitiesService: ActivitiesService, private router: Router, private formBuilder: FormBuilder) { }

  onSubmit(): void {
    const { title, description } = this.activityForm.value;
    const activityData: TNewActivity = {
      title: title!,
      description: description!
    }
    // Process checkout data here  
    this.activitiesService.createActivity(activityData).subscribe(data => {
      console.log(data);
    })
    //if OK, navigate to dashboard
    this.router.navigateByUrl('/dashboard');
  }

}
