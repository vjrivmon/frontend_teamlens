import { Component, EventEmitter, Input, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';

import { INotification } from '../../models/models';
import { 
  NotificationsService, 
  NotificationFilters, 
  NotificationState 
} from '../../services/notifications.service';

/**
 * Componente de Panel de Notificaciones Enterprise
 * 
 * Implementa una interfaz moderna y escalable para la gestión completa
 * de notificaciones con funcionalidades avanzadas de filtrado, paginación
 * y navegación contextual.
 * 
 * Características principales:
 * - UI/UX responsive y moderna con animaciones fluidas
 * - Paginación infinita con lazy loading
 * - Filtrado multi-criterio en tiempo real
 * - Búsqueda inteligente con debounce
 * - Gestión granular por notificación individual
 * - Navegación contextual y redirecciones automáticas
 * - Optimización de rendimiento y UX
 */
@Component({
  selector: 'app-notifications-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './notifications-panel.component.html',
  styleUrls: ['./notifications-panel.component.css']
})
export class NotificationsPanelComponent implements OnInit, OnDestroy {

  // Inyección de dependencias
  private notificationsService = inject(NotificationsService);
  private router = inject(Router);

  // Subject para la destrucción del componente
  private destroy$ = new Subject<void>();

  // Subject para la búsqueda con debounce
  private searchTerms = new Subject<string>();

  // Inputs del componente
  @Input() isOpen: boolean = false;
  @Input() maxHeight: string = '500px';
  @Input() showFilters: boolean = true;

  // Outputs del componente
  @Output() onClose = new EventEmitter<void>();
  @Output() onNotificationClick = new EventEmitter<INotification>();

  // Estado del componente
  public state: NotificationState = {
    notifications: [],
    unreadCount: 0,
    pagination: { page: 1, limit: 10, total: 0 },
    filters: { type: 'all', status: 'all', priority: 'all', search: '' },
    loading: false,
    hasMore: false
  };

  // Propiedades de UI
  public searchTerm: string = '';
  public showFilterPanel: boolean = false;
  public selectedNotifications: Set<string> = new Set();
  public isScrolling: boolean = false;

  // Configuración de tipos de notificación
  public notificationTypes = [
    { value: 'all', label: 'Todas', icon: 'inbox' },
    { value: 'activity', label: 'Actividades', icon: 'tasks' },
    { value: 'group', label: 'Grupos', icon: 'users' },
    { value: 'system', label: 'Sistema', icon: 'cog' }
  ];

  // Configuración de estados
  public notificationStatuses = [
    { value: 'all', label: 'Todas', icon: 'list' },
    { value: 'unread', label: 'No leídas', icon: 'circle' },
    { value: 'read', label: 'Leídas', icon: 'check circle' }
  ];

  // Configuración de prioridades
  public notificationPriorities = [
    { value: 'all', label: 'Todas', icon: 'star outline' },
    { value: 'high', label: 'Alta', icon: 'star' },
    { value: 'normal', label: 'Normal', icon: 'star half' },
    { value: 'low', label: 'Baja', icon: 'star outline' }
  ];

  ngOnInit(): void {
    this.initializeComponent();
    this.setupSubscriptions();
    this.setupSearchDebounce();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Inicializa el componente y carga las configuraciones necesarias
   */
  private initializeComponent(): void {
    console.log('🎯 NotificationsPanelComponent: Inicializando componente enterprise');
  }

  /**
   * Configura las suscripciones a los observables del servicio
   */
  private setupSubscriptions(): void {
    // Suscripción al estado completo del servicio
    this.notificationsService.state$
      .pipe(takeUntil(this.destroy$))
      .subscribe(state => {
        this.state = state;
        this.updateSearchTerm();
      });
  }

  /**
   * Configura el sistema de búsqueda con debounce para optimizar rendimiento
   */
  private setupSearchDebounce(): void {
    this.searchTerms
      .pipe(
        debounceTime(300),           // Espera 300ms después del último evento
        distinctUntilChanged(),      // Solo emite cuando el término cambia
        takeUntil(this.destroy$)
      )
      .subscribe(term => {
        this.notificationsService.searchNotifications(term);
      });
  }

  /**
   * Actualiza el término de búsqueda local desde el estado
   */
  private updateSearchTerm(): void {
    this.searchTerm = this.state.filters.search || '';
  }

  /**
   * Maneja el evento de búsqueda en tiempo real
   */
  public onSearch(term: string): void {
    this.searchTerms.next(term);
  }

  /**
   * Aplica filtros específicos al sistema
   */
  public applyFilter(filterType: keyof NotificationFilters, value: string): void {
    const filters: Partial<NotificationFilters> = {};
    filters[filterType] = value as any;
    this.notificationsService.applyFilters(filters);
  }

  /**
   * Alterna la visibilidad del panel de filtros
   */
  public toggleFilterPanel(): void {
    this.showFilterPanel = !this.showFilterPanel;
  }

  /**
   * Cierra el panel de notificaciones
   */
  public closePanel(): void {
    this.onClose.emit();
  }

  /**
   * Maneja el clic en una notificación individual
   */
  public onNotificationItemClick(notification: INotification): void {
    console.log(`🔔 NotificationsPanelComponent: Clic en notificación ${notification._id}`);

    // Marcar como leída si no lo está
    if (!notification.read) {
      this.markAsRead(notification);
    }

    // Emitir evento para el componente padre
    this.onNotificationClick.emit(notification);

    // Navegar si tiene enlace
    if (notification.link) {
      this.navigateToNotification(notification);
    }
  }

  /**
   * Navega a la URL de una notificación
   */
  private navigateToNotification(notification: INotification): void {
    if (notification.link) {
      // Cerrar el panel antes de navegar
      this.closePanel();
      
      // Navegación inteligente que refresca la ruta si es la misma
      this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
        this.router.navigateByUrl(notification.link!);
      });
    }
  }

  /**
   * Marca una notificación como leída
   */
  public markAsRead(notification: INotification): void {
    if (!notification.read) {
      this.notificationsService.markAsRead(notification._id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => console.log(`✅ Notificación ${notification._id} marcada como leída`),
          error: (error) => console.error('❌ Error al marcar como leída:', error)
        });
    }
  }

  /**
   * Marca una notificación como no leída
   */
  public markAsUnread(notification: INotification): void {
    if (notification.read) {
      this.notificationsService.markAsUnread(notification._id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => console.log(`📩 Notificación ${notification._id} marcada como no leída`),
          error: (error) => console.error('❌ Error al marcar como no leída:', error)
        });
    }
  }

  /**
   * Elimina una notificación específica
   */
  public deleteNotification(notification: INotification, event?: Event): void {
    // Prevenir propagación del evento
    if (event) {
      event.stopPropagation();
    }

    if (confirm('¿Está seguro de que desea eliminar esta notificación?')) {
      this.notificationsService.deleteNotification(notification._id)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => console.log(`🗑️ Notificación ${notification._id} eliminada`),
          error: (error) => console.error('❌ Error al eliminar notificación:', error)
        });
    }
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  public markAllAsRead(): void {
    if (this.state.unreadCount > 0) {
      this.notificationsService.markAllAsRead()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => console.log('✅ Todas las notificaciones marcadas como leídas'),
          error: (error) => console.error('❌ Error al marcar todas como leídas:', error)
        });
    }
  }

  /**
   * Elimina todas las notificaciones
   */
  public clearAllNotifications(): void {
    if (this.state.notifications.length > 0) {
      if (confirm('¿Está seguro de que desea eliminar todas las notificaciones?')) {
        this.notificationsService.clearAllNotifications()
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => console.log('🧹 Todas las notificaciones eliminadas'),
            error: (error) => console.error('❌ Error al eliminar todas las notificaciones:', error)
          });
      }
    }
  }

  /**
   * Refresca las notificaciones
   */
  public refreshNotifications(): void {
    this.notificationsService.refreshNotifications()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => console.log('🔄 Notificaciones refrescadas'),
        error: (error) => console.error('❌ Error al refrescar notificaciones:', error)
      });
  }

  /**
   * Carga más notificaciones (paginación infinita)
   */
  public loadMore(): void {
    if (this.state.hasMore && !this.state.loading) {
      this.notificationsService.loadMoreNotifications()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => console.log('📄 Más notificaciones cargadas'),
          error: (error) => console.error('❌ Error al cargar más notificaciones:', error)
        });
    }
  }

  /**
   * Maneja el evento de scroll para paginación infinita
   */
  public onScroll(event: Event): void {
    const element = event.target as HTMLElement;
    const isAtBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + 50;

    if (isAtBottom && this.state.hasMore && !this.state.loading) {
      this.loadMore();
    }
  }

  /**
   * Resetea todos los filtros
   */
  public resetFilters(): void {
    this.notificationsService.resetFilters();
    this.searchTerm = '';
  }

  /**
   * Alterna la selección de una notificación
   */
  public toggleNotificationSelection(notificationId: string): void {
    if (this.selectedNotifications.has(notificationId)) {
      this.selectedNotifications.delete(notificationId);
    } else {
      this.selectedNotifications.add(notificationId);
    }
  }

  /**
   * Obtiene el icono apropiado para una notificación
   */
  public getNotificationIcon(notification: INotification): string {
    if (notification.icon) {
      return notification.icon;
    }

    // Iconos por defecto según el tipo
    switch (notification.type) {
      case 'activity': return 'tasks';
      case 'group': return 'users';
      case 'system': return 'cog';
      default: return 'bell';
    }
  }

  /**
   * Obtiene la clase CSS para el estado de prioridad
   */
  public getPriorityClass(notification: INotification): string {
    switch (notification.priority) {
      case 'high': return 'priority-high';
      case 'low': return 'priority-low';
      default: return 'priority-normal';
    }
  }

  /**
   * Obtiene el texto formateado de fecha relativa
   */
  public getRelativeDate(date: Date | undefined): string {
    if (!date) return '';

    const now = new Date();
    const notificationDate = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - notificationDate.getTime()) / 1000);

    if (diffInSeconds < 60) return 'Hace un momento';
    if (diffInSeconds < 3600) return `Hace ${Math.floor(diffInSeconds / 60)} minutos`;
    if (diffInSeconds < 86400) return `Hace ${Math.floor(diffInSeconds / 3600)} horas`;
    if (diffInSeconds < 604800) return `Hace ${Math.floor(diffInSeconds / 86400)} días`;
    
    return notificationDate.toLocaleDateString();
  }

  /**
   * Verifica si hay notificaciones seleccionadas
   */
  public hasSelectedNotifications(): boolean {
    return this.selectedNotifications.size > 0;
  }

  /**
   * Obtiene el número de notificaciones seleccionadas
   */
  public getSelectedCount(): number {
    return this.selectedNotifications.size;
  }

  /**
   * Función de tracking para la optimización de ngFor
   */
  public trackByNotificationId(index: number, notification: INotification): string {
    return notification._id;
  }
} 