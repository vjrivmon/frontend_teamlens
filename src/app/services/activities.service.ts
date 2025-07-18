import { Injectable, inject } from '@angular/core';
import { IActivity, IGroup, IUser, INewActivity, INewGroup } from '../models/models';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class ActivitiesService {

  http = inject(HttpClient);

  getActivitiesByUserId(userId: string): Observable<IActivity[]> { 
    return this.http.get<IActivity[]>(`${environment.apiUrl}/users/${userId}/activities/`);
  }

  getActivityById(activityId: string): Observable<IActivity | undefined> {
    return this.http.get<IActivity>(`${environment.apiUrl}/activities/${activityId}`);
  }

  getStudentsByActivityById(activityId: string): Observable<IUser[] | undefined> {
    return this.http.get<IUser[]>(`${environment.apiUrl}/activities/${activityId}/students`);
  }

  getGroupsByActivityById(activityId: string): Observable<IGroup[] | undefined> {
    return this.http.get<IGroup[]>(`${environment.apiUrl}/activities/${activityId}/groups`);
  }

  createActivity(activityData: INewActivity): Observable<IActivity | undefined> {
    return this.http.post<IActivity>(`${environment.apiUrl}/activities/`, activityData);
  }

  createGroup(activityId: string, groupData: INewGroup): Observable<IGroup | undefined> {
    return this.http.post<IGroup>(`${environment.apiUrl}/activities/${activityId}/groups`, groupData);
  }

  createGroupsAlgorithm(activityId: string, algorithmData: {}): Observable<IGroup | undefined> {
    return this.http.post<IGroup>(`${environment.apiUrl}/activities/${activityId}/create-algorithm`, algorithmData);
  }

  getGroupById(activityId: string, groupId: string): Observable<IGroup | undefined> {
    return this.http.get<IGroup>(`${environment.apiUrl}/activities/${activityId}/groups/${groupId}`);
  }

  addStudentsToActivityByEmail(activityId: string, emails: string[]): Observable<IUser[] | undefined> {
    return this.http.post<IUser[]>(`${environment.apiUrl}/activities/${activityId}/students`, { emails });
  }

  deleteActivityById(activityId: string): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/activities/${activityId}`);
  }
  
  deleteGroupById(activityId: string, groupId: string): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/activities/${activityId}/groups/${groupId}`);
  }

  addStudentToGroup(activityId: string, groupId: string, studentIds: string[]): Observable<any> {
    return this.http.post(`${environment.apiUrl}/activities/${activityId}/groups/${groupId}/students`, { students: studentIds });
  }

  removeStudentFromGroup(activityId: string, groupId: string, studentId: string): Observable<any> {
    return this.http.delete(`${environment.apiUrl}/activities/${activityId}/groups/${groupId}/students/${studentId}`);
  }

  /**
   * Envía un cuestionario a todos los estudiantes de una actividad que aún no lo han respondido
   * @param activityId ID de la actividad
   * @param questionnaireId ID del cuestionario a enviar
   * @returns Observable con la respuesta del servidor
   */
  sendQuestionnaireToStudents(activityId: string, questionnaireId: string): Observable<any> {
    return this.http.post(`${environment.apiUrl}/activities/${activityId}/send-questionnaire-remaining/${questionnaireId}`, {});
  }

  /**
   * 🚀 NUEVA FUNCIÓN: Confirma grupos en estado 'draft' y envía notificaciones a estudiantes
   * @param activityId ID de la actividad
   * @param groupIds (Opcional) IDs específicos de grupos a confirmar. Si no se proporciona, confirma todos los draft
   * @returns Observable con la respuesta del servidor
   */
  confirmGroups(activityId: string, groupIds?: string[]): Observable<any> {
    const body = groupIds ? { groupIds } : {};
    return this.http.post(`${environment.apiUrl}/activities/${activityId}/groups/confirm`, body);
  }

}
