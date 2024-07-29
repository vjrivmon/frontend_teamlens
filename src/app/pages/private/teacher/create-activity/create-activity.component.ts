import { Component, EventEmitter, Output } from '@angular/core';
import { Router } from '@angular/router';

import { FormBuilder, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';

import { ActivitiesService } from '../../../../services/activities.service';
import { IActivity, INewActivity } from '../../../../models/models';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';

export interface IActivityCreatedEvent {
  ok: boolean;
  activity: IActivity;
}

@Component({
  selector: 'app-create-activity',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule, InputTextareaModule],
  templateUrl: './create-activity.component.html',
  styleUrl: './create-activity.component.css'
})
export class CreateActivityComponent {

  @Output() onActivityCreated = new EventEmitter<IActivityCreatedEvent>();

  activityForm = this.formBuilder.group({
    title: ['', [Validators.required]],
    description: ['', [Validators.required]]
  })

  constructor(private activitiesService: ActivitiesService, private router: Router, private formBuilder: FormBuilder) { }

  onSubmit(): void {

    const { title, description } = this.activityForm.value;

    const activityData: INewActivity = {
      title: title!,
      description: description!,
      //finishDate: new Date().getTime()
    }

    // Process checkout data here  
    this.activitiesService.createActivity(activityData).subscribe({
      next: (data: any) => {
        this.activityForm.reset();
        this.onActivityCreated.emit({ ok: true, activity: data.activity });
      }
    })

    //if OK, navigate to dashboard
    //this.router.navigateByUrl('/dashboard');
  }

}
