import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable, interval, timer } from 'rxjs';
import { map, filter, distinctUntilChanged } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { INotification, IUser } from '../models/models';
import { WebSocketService } from './websocket.service';
import { environment } from '../../environments/environment';

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
  private webSocketService = inject(WebSocketService);
  private readonly API_BASE = '';

  // Sistema de polling como respaldo
  private readonly POLLING_INTERVAL = 30000; // 30 segundos
  private readonly QUICK_CHECK_INTERVAL = 10000; // 10 segundos para verificaciones rápidas
  
  private pollingTimer: any;
  private lastQuickCheckCount = 0;
  private lastQuickCheckUnread = 0;

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
    console.log('🌐 NotificationsService: Integrando WebSocket y sistema de polling');
  }

  /**
   * Inicializa el servicio y carga las notificaciones iniciales
   * Establece los listeners necesarios para la sincronización
   */
  private initializeService(): void {
    console.log('🔔 NotificationsService: Inicializando sistema de notificaciones enterprise');
    
    // Cargar notificaciones iniciales
    this.loadInitialNotifications();
    
    // Configurar listeners WebSocket
    this.setupWebSocketListeners();
    
    // Configurar polling como respaldo
    this.setupPollingBackup();
  }

  /**
   * Configura los listeners de eventos WebSocket para notificaciones en tiempo real
   */
  private setupWebSocketListeners(): void {
    console.log('🌐 NotificationsService: Configurando listeners WebSocket');

    // Escuchar eventos de notificaciones del WebSocket
    this.webSocketService.notificationEvents$
      .pipe(filter(event => event !== null))
      .subscribe(event => {
        console.log('🔔 NotificationsService: Evento WebSocket recibido:', event);
        this.handleWebSocketEvent(event);
      });

    // Monitorear estado de conexión WebSocket
    this.webSocketService.connected$
      .pipe(distinctUntilChanged())
      .subscribe(connected => {
        if (connected) {
          console.log('✅ NotificationsService: WebSocket conectado - desactivando polling');
          this.stopPolling();
        } else {
          console.log('❌ NotificationsService: WebSocket desconectado - activando polling');
          this.startPolling();
        }
      });
  }

  /**
   * Maneja eventos recibidos por WebSocket
   */
  private handleWebSocketEvent(event: any): void {
    switch (event.type) {
      case 'new-notification':
        this.handleNewNotificationEvent(event.data);
        break;
        
      case 'notification-read':
        this.handleNotificationReadEvent(event.data);
        break;
        
      case 'notification-deleted':
        this.handleNotificationDeletedEvent(event.data);
        break;
        
      case 'all-notifications-read':
        this.handleAllNotificationsReadEvent();
        break;
        
      case 'high-priority-notification':
        this.handleHighPriorityNotificationEvent(event.data);
        break;
        
      case 'new-activity-assignment':
        // Este evento puede generar una notificación visual adicional
        this.handleActivityAssignmentEvent(event.data);
        break;
        
      default:
        console.log('ℹ️ NotificationsService: Evento WebSocket no manejado:', event.type);
    }
  }

  /**
   * Maneja nueva notificación recibida por WebSocket
   */
  private handleNewNotificationEvent(notificationData: any): void {
    console.log('🔔 NotificationsService: Procesando nueva notificación:', notificationData);
    
    const currentState = this.getCurrentState();
    const notificationDate = new Date(notificationData.timestamp);
    const newNotification: INotification = {
      _id: notificationData.notificationId,
      title: notificationData.title,
      description: notificationData.description,
      type: notificationData.type,
      priority: notificationData.priority,
      icon: notificationData.icon,
      link: notificationData.link,
      read: false,
      timestamp: notificationDate,
      date: notificationDate,
      actionRequired: notificationData.actionRequired || false
    };

    // Añadir al inicio de la lista
    const updatedNotifications = [newNotification, ...currentState.notifications];
    
    this.updateState({
      notifications: updatedNotifications,
      unreadCount: this.calculateUnreadCount(updatedNotifications),
      pagination: { 
        ...currentState.pagination, 
        total: currentState.pagination.total + 1 
      }
    });

    // Mostrar notificación visual si es de alta prioridad
    if (notificationData.priority === 'high') {
      this.showHighPriorityToast(newNotification);
    }
  }

  /**
   * Maneja notificación marcada como leída por WebSocket
   */
  private handleNotificationReadEvent(eventData: any): void {
    console.log('📖 NotificationsService: Notificación marcada como leída:', eventData.notificationId);
    this.updateNotificationInState(eventData.notificationId, { read: true });
  }

  /**
   * Maneja notificación eliminada por WebSocket
   */
  private handleNotificationDeletedEvent(eventData: any): void {
    console.log('🗑️ NotificationsService: Notificación eliminada:', eventData.notificationId);
    this.removeNotificationFromState(eventData.notificationId);
  }

  /**
   * Maneja todas las notificaciones marcadas como leídas
   */
  private handleAllNotificationsReadEvent(): void {
    console.log('📚 NotificationsService: Todas las notificaciones marcadas como leídas');
    const currentState = this.getCurrentState();
    const updatedNotifications = currentState.notifications.map(n => ({ ...n, read: true }));
    
    this.updateState({
      notifications: updatedNotifications,
      unreadCount: 0
    });
  }

  /**
   * Maneja notificación de alta prioridad
   */
  private handleHighPriorityNotificationEvent(notificationData: any): void {
    console.log('🚨 NotificationsService: Notificación de ALTA PRIORIDAD recibida');
    this.handleNewNotificationEvent(notificationData);
    this.showHighPriorityToast(notificationData);
  }

  /**
   * Maneja evento de nueva asignación de actividad
   */
  private handleActivityAssignmentEvent(eventData: any): void {
    console.log('📋 NotificationsService: Nueva actividad asignada:', eventData);
    // Este evento puede requerir recargar las notificaciones
    this.refreshNotifications().subscribe();
  }

  /**
   * Muestra una notificación toast para alta prioridad
   */
  private showHighPriorityToast(notification: any): void {
    // Aquí se puede integrar con un servicio de toast/snackbar
    console.log('🚨 TOAST: Notificación de alta prioridad:', notification.title);
    
    // Ejemplo con alert (reemplazar con toast real)
    if (notification.priority === 'high') {
      // Solo mostrar si no está en modo silencioso
      setTimeout(() => {
        console.log(`🚨 NOTIFICACIÓN URGENTE: ${notification.title}`);
      }, 100);
    }
  }

  /**
   * Configura el sistema de polling como respaldo
   */
  private setupPollingBackup(): void {
    console.log('🔄 NotificationsService: Configurando sistema de polling de respaldo');
    
    // Solo iniciar polling si WebSocket no está conectado
    if (!this.webSocketService.isConnected()) {
      this.startPolling();
    }
  }

  /**
   * Inicia el sistema de polling
   */
  private startPolling(): void {
    if (this.pollingTimer) {
      return; // Ya está activo
    }

    console.log('🔄 NotificationsService: Iniciando polling de respaldo');
    
    // Polling para verificaciones rápidas cada 10 segundos
    this.pollingTimer = interval(this.QUICK_CHECK_INTERVAL).subscribe(() => {
      this.performQuickCheck();
    });

    // Polling completo cada 30 segundos
    interval(this.POLLING_INTERVAL).subscribe(() => {
      if (!this.webSocketService.isConnected()) {
        console.log('🔄 NotificationsService: Polling completo - WebSocket desconectado');
        this.refreshNotifications().subscribe();
      }
    });
  }

  /**
   * Detiene el sistema de polling
   */
  private stopPolling(): void {
    if (this.pollingTimer) {
      console.log('⏹️ NotificationsService: Deteniendo polling - WebSocket activo');
      this.pollingTimer.unsubscribe();
      this.pollingTimer = null;
    }
  }

  /**
   * Realiza verificación rápida de cambios
   */
  private performQuickCheck(): void {
    const currentState = this.getCurrentState();
    
    this.http.get(`${this.API_BASE}/users/notifications/quick-check`, {
      params: {
        lastCount: this.lastQuickCheckCount.toString(),
        lastUnread: this.lastQuickCheckUnread.toString()
      }
    }).subscribe({
      next: (response: any) => {
        if (response.hasChanges) {
          console.log('🔄 NotificationsService: Cambios detectados via polling, refrescando...');
          this.refreshNotifications().subscribe();
        }
        
        this.lastQuickCheckCount = response.totalCount;
        this.lastQuickCheckUnread = response.unreadCount;
      },
      error: (error) => {
        console.error('❌ NotificationsService: Error en quick check:', error);
      }
    });
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

    return this.http.get<NotificationPaginatedResponse>(`${environment.apiUrl}/users/notifications`, { params })
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

  /**
   * Verifica el estado de conexión WebSocket
   */
  public isWebSocketConnected(): boolean {
    return this.webSocketService.isConnected();
  }

  /**
   * Fuerza reconexión WebSocket
   */
  public reconnectWebSocket(): void {
    console.log('🔄 NotificationsService: Forzando reconexión WebSocket');
    this.webSocketService.forceReconnect();
  }

  /**
   * Obtiene estadísticas de conexión
   */
  public getConnectionStats(): any {
    return {
      websocketConnected: this.webSocketService.isConnected(),
      pollingActive: !!this.pollingTimer,
      connectionInfo: this.webSocketService.getConnectionInfo()
    };
  }

  /**
   * Método de limpieza para destruir el servicio
   */
  public destroy(): void {
    console.log('🧹 NotificationsService: Limpiando recursos...');
    
    // Detener polling
    this.stopPolling();
    
    // Limpiar estado
    this.updateState(this.initialState);
    
    console.log('✅ NotificationsService: Recursos limpiados');
  }
} 
