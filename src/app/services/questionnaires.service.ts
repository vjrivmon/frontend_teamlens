import { Injectable, inject } from '@angular/core';
import { IQuestionnaire, TQuestionnaireResult, IQuestionnaireStats } from '../models/models';
import { Observable } from 'rxjs';

import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class QuestionnairesService {
 

  http = inject(HttpClient);
  
  getQuestionnaires(): Observable<IQuestionnaire[]> {
    return this.http.get<IQuestionnaire[]>('http://localhost:3000/questionnaires/');
  }

  getQuestionnairesByUserId(userId: string): Observable<IQuestionnaire[]> { 
    return this.http.get<IQuestionnaire[]>('http://localhost:3000/users/' + userId + '/questionnaires/');
  }

  getQuestionnaireById(questionnaireId: string): Observable<IQuestionnaire | undefined> {
    return this.http.get<IQuestionnaire>('http://localhost:3000/questionnaires/' + questionnaireId);
  }

  getAskedQuestionnaires(): Observable<TQuestionnaireResult[]> {
    return this.http.get<TQuestionnaireResult[]>('http://localhost:3000/questionnaires/asked');
  }

  /**
   * Obtiene las estadísticas de completitud de cuestionarios para una actividad específica
   * @param activityId ID de la actividad
   * @returns Observable con las estadísticas de cada cuestionario
   */
  getQuestionnaireStatsByActivity(activityId: string): Observable<IQuestionnaireStats[]> {
    return this.http.get<IQuestionnaireStats[]>(`http://localhost:3000/questionnaires/activity/${activityId}/stats`);
  }

  //getQuestionnairesByActivityId(activityId: string): Observable<IQuestionnaire[]> {

  submitQuestionnaire(questionnaireId: string, value: any): Observable<any> {
    return this.http.put<any>('http://localhost:3000/questionnaires/' + questionnaireId + '/submit', value);
  }

}