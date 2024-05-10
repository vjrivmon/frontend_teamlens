import { Component } from '@angular/core';
import { ActivitiesListComponent } from '../components/activities-list/activities-list.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [ActivitiesListComponent],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {

}
