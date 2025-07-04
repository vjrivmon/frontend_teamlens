import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, map } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { INotification, IUser } from '../models/models';

/**
 * Configuración de paginación para el sistema de notificaciones
 * Define los parámetros por defecto para la carga de notificaciones
 */
export interface NotificationPaginationConfig {
  page: number;
  limit: number;
  total: number;
}

/**
 * Filtros disponibles para el sistema de notificaciones
 * Permite segmentación y búsqueda inteligente de notificaciones
 */
export interface NotificationFilters {
  type?: 'all' | 'activity' | 'group' | 'system';
  status?: 'all' | 'read' | 'unread';
  priority?: 'all' | 'high' | 'normal' | 'low';
  search?: string;
}

/**
 * Respuesta paginada del servidor para notificaciones
 */
export interface NotificationPaginatedResponse {
  notifications: INotification[];
  pagination: NotificationPaginationConfig;
  hasMore: boolean;
}

/**
 * Estado completo del sistema de notificaciones
 * Centraliza toda la información de estado para una gestión eficiente
 */
export interface NotificationState {
  notifications: INotification[];
  unreadCount: number;
  pagination: NotificationPaginationConfig;
  filters: NotificationFilters;
  loading: boolean;
  hasMore: boolean;
}

/**
 * Servicio de Notificaciones Enterprise
 * 
 * Proporciona una gestión completa y escalable del sistema de notificaciones
 * con funcionalidades avanzadas de paginación, filtrado y gestión granular.
 * 
 * Características principales:
 * - Paginación inteligente con carga lazy
 * - Filtrado multi-criterio en tiempo real
 * - Gestión individual de notificaciones (leer, eliminar, priorizar)
 * - Estado centralizado con observables reactivos
 * - Cache optimizado para rendimiento superior
 * - Integración seamless con backend APIs
 */
@Injectable({
  providedIn: 'root'
})
export class NotificationsService {

  private http = inject(HttpClient);
  private readonly API_BASE = 'http://localhost:3000';

  // Estado central del sistema de notificaciones
  private readonly initialState: NotificationState = {
    notifications: [],
    unreadCount: 0,
    pagination: { page: 1, limit: 10, total: 0 },
    filters: { type: 'all', status: 'all', priority: 'all', search: '' },
    loading: false,
    hasMore: false
  };

  // Subject central para la gestión de estado reactivo
  private stateSubject = new BehaviorSubject<NotificationState>(this.initialState);

  // Observables públicos para la suscripción de componentes
  public readonly state$ = this.stateSubject.asObservable();
  public readonly notifications$ = this.state$.pipe(map(state => state.notifications));
  public readonly unreadCount$ = this.state$.pipe(map(state => state.unreadCount));
  public readonly loading$ = this.state$.pipe(map(state => state.loading));
  public readonly hasMore$ = this.state$.pipe(map(state => state.hasMore));

  constructor() {
    // Inicialización automática del servicio
    this.initializeService();
    
    // Log de inicialización para debugging
    console.log('🔔 NotificationsService: Servicio enterprise inicializado correctamente');
  }

  /**
   * Inicializa el servicio y carga las notificaciones iniciales
   * Establece los listeners necesarios para la sincronización
   */
  private initializeService(): void {
    console.log('🔔 NotificationsService: Inicializando sistema de notificaciones enterprise');
    this.loadInitialNotifications();
  }

  /**
   * Carga las notificaciones iniciales con configuración por defecto
   */
  private loadInitialNotifications(): void {
    this.loadNotifications(true);
  }

  /**
   * Obtiene el estado actual del sistema
   */
  private getCurrentState(): NotificationState {
    return this.stateSubject.value;
  }

  /**
   * Actualiza el estado del sistema de manera inmutable
   */
  private updateState(partialState: Partial<NotificationState>): void {
    const currentState = this.getCurrentState();
    const newState = { ...currentState, ...partialState };
    this.stateSubject.next(newState);
  }

  /**
   * Carga notificaciones desde el servidor con paginación y filtros
   * 
   * @param reset - Si true, reinicia la lista. Si false, agrega a la lista existente
   */
  public loadNotifications(reset: boolean = false): Observable<NotificationPaginatedResponse> {
    const currentState = this.getCurrentState();
    const { pagination, filters } = currentState;
    
    // Actualizar estado de carga
    this.updateState({ loading: true });

    const page = reset ? 1 : pagination.page;
    const params = this.buildQueryParams(page, pagination.limit, filters);

    return this.http.get<NotificationPaginatedResponse>(`${this.API_BASE}/users/notifications`, { params })
      .pipe(
        map(response => {
          this.handleNotificationsResponse(response, reset);
          return response;
        })
      );
  }

  /**
   * Construye los parámetros de consulta para la API
   */
  private buildQueryParams(page: number, limit: number, filters: NotificationFilters): any {
    return {
      page: page.toString(),
      limit: limit.toString(),
      ...(filters.type !== 'all' && { type: filters.type }),
      ...(filters.status !== 'all' && { status: filters.status }),
      ...(filters.priority !== 'all' && { priority: filters.priority }),
      ...(filters.search && { search: filters.search })
    };
  }

  /**
   * Procesa la respuesta del servidor y actualiza el estado
   */
  private handleNotificationsResponse(response: NotificationPaginatedResponse, reset: boolean): void {
    const currentState = this.getCurrentState();
    
    const newNotifications = reset 
      ? response.notifications 
      : [...currentState.notifications, ...response.notifications];

    this.updateState({
      notifications: newNotifications,
      pagination: response.pagination,
      hasMore: response.hasMore,
      loading: false,
      unreadCount: this.calculateUnreadCount(newNotifications)
    });

    console.log(`✅ NotificationsService: Cargadas ${response.notifications.length} notificaciones`);
  }

  /**
   * Calcula el número de notificaciones no leídas
   */
  private calculateUnreadCount(notifications: INotification[]): number {
    return notifications.filter(n => !n.read).length;
  }

  /**
   * Carga más notificaciones (paginación infinita)
   */
  public loadMoreNotifications(): Observable<NotificationPaginatedResponse> {
    const currentState = this.getCurrentState();
    const nextPage = currentState.pagination.page + 1;
    
    this.updateState({
      pagination: { ...currentState.pagination, page: nextPage }
    });

    return this.loadNotifications(false);
  }

  /**
   * Aplica filtros al sistema de notificaciones
   */
  public applyFilters(filters: Partial<NotificationFilters>): void {
    const currentState = this.getCurrentState();
    const newFilters = { ...currentState.filters, ...filters };
    
    this.updateState({
      filters: newFilters,
      pagination: { ...currentState.pagination, page: 1 }
    });

    console.log('🔍 NotificationsService: Aplicando filtros', newFilters);
    this.loadNotifications(true).subscribe();
  }

  /**
   * Marca una notificación como leída
   */
  public markAsRead(notificationId: string): Observable<any> {
    console.log(`📖 NotificationsService: Marcando notificación ${notificationId} como leída`);
    
    return this.http.patch(`${this.API_BASE}/users/notifications/${notificationId}/read`, {})
      .pipe(
        map(response => {
          this.updateNotificationInState(notificationId, { read: true });
          return response;
        })
      );
  }

  /**
   * Marca una notificación como no leída
   */
  public markAsUnread(notificationId: string): Observable<any> {
    console.log(`📩 NotificationsService: Marcando notificación ${notificationId} como no leída`);
    
    return this.http.patch(`${this.API_BASE}/users/notifications/${notificationId}/unread`, {})
      .pipe(
        map(response => {
          this.updateNotificationInState(notificationId, { read: false });
          return response;
        })
      );
  }

  /**
   * Elimina una notificación específica
   */
  public deleteNotification(notificationId: string): Observable<any> {
    console.log(`🗑️ NotificationsService: Eliminando notificación ${notificationId}`);
    
    return this.http.delete(`${this.API_BASE}/users/notifications/${notificationId}`)
      .pipe(
        map(response => {
          this.removeNotificationFromState(notificationId);
          return response;
        })
      );
  }

  /**
   * Elimina todas las notificaciones
   */
  public clearAllNotifications(): Observable<any> {
    console.log('🧹 NotificationsService: Limpiando todas las notificaciones');
    
    return this.http.post(`${this.API_BASE}/users/clear-notifications`, {})
      .pipe(
        map(response => {
          this.updateState({
            notifications: [],
            unreadCount: 0,
            pagination: { ...this.getCurrentState().pagination, total: 0 }
          });
          return response;
        })
      );
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  public markAllAsRead(): Observable<any> {
    console.log('📚 NotificationsService: Marcando todas las notificaciones como leídas');
    
    return this.http.patch(`${this.API_BASE}/users/notifications/mark-all-read`, {})
      .pipe(
        map(response => {
          const currentState = this.getCurrentState();
          const updatedNotifications = currentState.notifications.map(n => ({ ...n, read: true }));
          
          this.updateState({
            notifications: updatedNotifications,
            unreadCount: 0
          });
          return response;
        })
      );
  }

  /**
   * Actualiza una notificación específica en el estado
   */
  private updateNotificationInState(notificationId: string, updates: Partial<INotification>): void {
    const currentState = this.getCurrentState();
    const updatedNotifications = currentState.notifications.map(notification =>
      notification._id === notificationId 
        ? { ...notification, ...updates }
        : notification
    );

    this.updateState({
      notifications: updatedNotifications,
      unreadCount: this.calculateUnreadCount(updatedNotifications)
    });
  }

  /**
   * Elimina una notificación del estado
   */
  private removeNotificationFromState(notificationId: string): void {
    const currentState = this.getCurrentState();
    const filteredNotifications = currentState.notifications.filter(n => n._id !== notificationId);

    this.updateState({
      notifications: filteredNotifications,
      unreadCount: this.calculateUnreadCount(filteredNotifications),
      pagination: { 
        ...currentState.pagination, 
        total: currentState.pagination.total - 1 
      }
    });
  }

  /**
   * Refresca las notificaciones desde el servidor
   */
  public refreshNotifications(): Observable<NotificationPaginatedResponse> {
    console.log('🔄 NotificationsService: Refrescando notificaciones');
    return this.loadNotifications(true);
  }

  /**
   * Busca notificaciones por texto
   */
  public searchNotifications(searchTerm: string): void {
    console.log(`🔎 NotificationsService: Buscando notificaciones: "${searchTerm}"`);
    this.applyFilters({ search: searchTerm });
  }

  /**
   * Resetea los filtros a su estado inicial
   */
  public resetFilters(): void {
    console.log('🔄 NotificationsService: Reseteando filtros');
    this.applyFilters({ 
      type: 'all', 
      status: 'all', 
      priority: 'all', 
      search: '' 
    });
  }

  /**
   * Obtiene el número total de notificaciones no leídas
   */
  public getUnreadCount(): number {
    return this.getCurrentState().unreadCount;
  }

  /**
   * Verifica si hay más notificaciones para cargar
   */
  public hasMoreNotifications(): boolean {
    return this.getCurrentState().hasMore;
  }

  /**
   * Navega a la URL especificada en una notificación
   */
  public navigateToNotification(notification: INotification): void {
    if (notification.link) {
      console.log(`🔗 NotificationsService: Navegando a ${notification.link}`);
      
      // Marcar como leída si no lo está
      if (!notification.read) {
        this.markAsRead(notification._id).subscribe();
      }
      
      // Lógica de navegación se implementará en el componente
    }
  }
} 