import { Injectable, inject } from '@angular/core';
import { IActivity, IGroup, TNewActivity, TNewGroup } from '../models/models';
import { Observable, of } from 'rxjs';

import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ActivitiesService {

  static activities: IActivity[] = [
    {
      id: '1',
      title: 'Maths',
      description: 'Maths class',
      teacher: {
        id: '0',
        email: 'teacher@mail.com',
        name: 'Teacher',
        role: 'teacher'
      },
      students: [
        {
          id: '1',
          email: 'student1@mail.com',
          name: 'Student 1',
          role: 'student'
        },
        {
          id: '2',
          email: 'student2@mail.com',
          name: 'Student 2',
          role: 'student'
        },
        {
          id: '3',
          email: 'student3@mail.com',
          name: 'Student 3',
          role: 'student',
        },
        {
          id: '4',
          email: 'student4@mail.com',
          name: 'Student 4',
          role: 'student'
        },
        {
          id: '5',
          email: 'student5@mail.com',
          name: 'Student 5',
          role: 'student'
        },
      ],
      groups: [
        {
          id: '1',
          name: 'Group 1',
          members: [
            {
              id: '1',
              email: 'student1@mail.com',
              name: 'Student 1',
              role: 'student'
            },
            {
              id: '2',
              email: 'student2@mail.com',
              name: 'Student 2',
              role: 'student'
            },
          ]
        },
        {
          id: '2',
          name: 'Group 2',
          members: [
            {
              id: '3',
              email: 'student3@mail.com',
              name: 'Student 3',
              role: 'student'
            },
            {
              id: '4',
              email: 'student4@mail.com',
              name: 'Student 4',
              role: 'student'
            },
          ]
        }
      ]
    }
  ];
  
  http = inject(HttpClient);

  getActivities(): Observable<IActivity[]> {
    // This is a mockup of the data that would come from a backend
    //return this.http.get<IActivity[]>('http://localhost:3000/activities'); // Specify the type of the response as IActivity[]
    return of(ActivitiesService.activities);
  }

  getActivity(activityId: string): Observable<IActivity | undefined> {
    return of(ActivitiesService.activities.find(activity => activity.id === activityId));
  }

  createActivity(activityData: TNewActivity): Observable<IActivity | undefined> {

    const activity: IActivity = {
      id: String(ActivitiesService.activities.length + 1),
      teacher: { //get logged user id
        id: "1",
        name: "teacher",
        email: "teacher@mail.com",
        role: "teacher"
      },
      groups: [],
      students: [],
      ...activityData,
    }
    ActivitiesService.activities.push(activity);

    return of(activity)

  }

  createGroup(activity: IActivity, groupData: TNewGroup): Observable<IGroup | undefined> {
   
    if(!activity) return of(undefined); //more detailed error
    
    const group: IGroup = {
      id: String(activity.groups.length + 1),
      ...groupData
    }

    activity.groups.push(group);

    return of(group)
  }

  getGroup(activityId: string, groupId: string): Observable<IGroup | undefined> {
    const activity = ActivitiesService.activities.find(a => a.id === activityId);
    if(!activity) return of(undefined);
    return of(activity.groups.find(g => g.id === groupId));
  }
  
}