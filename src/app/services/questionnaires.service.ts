import { Injectable, inject } from '@angular/core';
import { IQuestionnaire, TQuestionnaireResult, IQuestionnaireStats } from '../models/models';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class QuestionnairesService {
 

  http = inject(HttpClient);
  
  getQuestionnaires(): Observable<IQuestionnaire[]> {
    return this.http.get<IQuestionnaire[]>(`${environment.apiUrl}/questionnaires/`);
  }

  getQuestionnairesByUserId(userId: string): Observable<IQuestionnaire[]> { 
    return this.http.get<IQuestionnaire[]>(`${environment.apiUrl}/users/${userId}/questionnaires/`);
  }

  getQuestionnaireById(questionnaireId: string): Observable<IQuestionnaire | undefined> {
    return this.http.get<IQuestionnaire>(`${environment.apiUrl}/questionnaires/${questionnaireId}`);
  }

  getAskedQuestionnaires(): Observable<TQuestionnaireResult[]> {
    return this.http.get<TQuestionnaireResult[]>(`${environment.apiUrl}/questionnaires/asked`);
  }

  /**
   * Obtiene las estadísticas de completitud de cuestionarios para una actividad específica
   * @param activityId ID de la actividad
   * @returns Observable con las estadísticas de cada cuestionario
   */
  getQuestionnaireStatsByActivity(activityId: string): Observable<IQuestionnaireStats[]> {
    return this.http.get<IQuestionnaireStats[]>(`${environment.apiUrl}/questionnaires/activity/${activityId}/stats`);
  }

  //getQuestionnairesByActivityId(activityId: string): Observable<IQuestionnaire[]> {

  submitQuestionnaire(questionnaireId: string, value: any): Observable<any> {
    return this.http.put<any>(`${environment.apiUrl}/questionnaires/${questionnaireId}/submit`, value);
  }

  /**
   * Envía un cuestionario de forma anónima (sin autenticación)
   * @param questionnaireId ID del cuestionario
   * @param value Respuestas del cuestionario
   * @param email Email del estudiante
   * @returns Observable con la respuesta del servidor
   */
  submitAnonymousQuestionnaire(questionnaireId: string, value: any, email: string): Observable<any> {
    const submissionData = {
      ...value,
      email: email
    };
    
    console.log('🎯 [QuestionnairesService] Enviando cuestionario anónimo:', {
      questionnaireId,
      email,
      hasData: !!value
    });

    return this.http.put<any>(`${environment.apiUrl}/questionnaires/${questionnaireId}/submit-anonymous`, submissionData);
  }

}
