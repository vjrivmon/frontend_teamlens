import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { NotificationsService } from '../../services/notifications.service';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subject, takeUntil, map } from 'rxjs';
import { IUser, INotification } from '../../models/models';
import { NotificationsPanelComponent } from '../../components/notifications-panel/notifications-panel.component';

/**
 * Componente Header con Sistema de Notificaciones Enterprise
 * 
 * Integra el nuevo sistema de notificaciones avanzado con funcionalidades
 * de gestión granular, paginación y navegación contextual.
 * 
 * Características principales:
 * - Indicador visual inteligente de notificaciones no leídas
 * - Panel moderno con gestión completa de notificaciones
 * - Navegación contextual automática
 * - Optimización de rendimiento con observables
 * - Integración seamless con el sistema legacy
 */
@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule, NotificationsPanelComponent],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent implements OnInit, OnDestroy {

  // Inyección de dependencias
  private authService = inject(AuthService);
  private notificationsService = inject(NotificationsService);
  private router = inject(Router);

  // Subject para la destrucción del componente
  private destroy$ = new Subject<void>();

  // Propiedades del componente
  public loggedUser: IUser | undefined = undefined;
  public notificationPanelOpen = false;

  // Observables del sistema de notificaciones enterprise
  public unreadCount$ = this.notificationsService.unreadCount$;
  public hasNotifications$ = this.notificationsService.notifications$.pipe(
    map(notifications => notifications.length > 0)
  );

  ngOnInit(): void {
    this.initializeComponent();
    this.setupSubscriptions();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Inicializa el componente y configura el estado inicial
   */
  private initializeComponent(): void {
    console.log('🎯 HeaderComponent: Inicializando header con notificaciones enterprise');
    this.authService.refreshUserData();
  }

  /**
   * Configura las suscripciones a los observables necesarios
   */
  private setupSubscriptions(): void {
    // Suscripción al usuario logueado
    this.authService.loggedUser
      .pipe(takeUntil(this.destroy$))
      .subscribe(loggedUser => {
        this.loggedUser = loggedUser;
        
        // Log de cambio de usuario para debugging
        if (loggedUser) {
          console.log(`👤 HeaderComponent: Usuario logueado - ${loggedUser.email}`);
        } else {
          console.log('👤 HeaderComponent: Usuario desconectado');
        }
      });
  }

  /**
   * Maneja el logout del usuario
   */
  public logoutButton(): void {
    console.log('🚪 HeaderComponent: Procesando logout');
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }

  /**
   * Alterna la visibilidad del panel de notificaciones
   */
  public toggleNotificationPanel(): void {
    this.notificationPanelOpen = !this.notificationPanelOpen;
    
    console.log(`🔔 HeaderComponent: Panel de notificaciones ${this.notificationPanelOpen ? 'abierto' : 'cerrado'}`);
    
    // Si se abre el panel, refrescar notificaciones
    if (this.notificationPanelOpen) {
      this.refreshNotifications();
    }
  }

  /**
   * Cierra el panel de notificaciones
   */
  public closeNotificationPanel(): void {
    this.notificationPanelOpen = false;
    console.log('❌ HeaderComponent: Panel de notificaciones cerrado desde el panel');
  }

  /**
   * Refresca las notificaciones desde el servidor
   */
  public refreshNotifications(): void {
    console.log('🔄 HeaderComponent: Refrescando notificaciones');
    this.notificationsService.refreshNotifications()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => console.log('✅ HeaderComponent: Notificaciones refrescadas exitosamente'),
        error: (error) => console.error('❌ HeaderComponent: Error refrescando notificaciones:', error)
      });
  }

  /**
   * Maneja el clic en una notificación específica
   */
  public onNotificationClick(notification: INotification): void {
    console.log(`🔔 HeaderComponent: Clic en notificación - ${notification.title}`);
    
    // El panel se encargará de la navegación y marcado como leída
    // Aquí podemos agregar lógica adicional si es necesario
    
    // Cerrar el panel después de hacer clic en una notificación
    this.closeNotificationPanel();
  }

  /**
   * Elimina todas las notificaciones (método legacy mantenido para compatibilidad)
   */
  public clearNotifications(): void {
    console.log('🧹 HeaderComponent: Limpiando todas las notificaciones (método legacy)');
    
    this.notificationsService.clearAllNotifications()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.log('✅ HeaderComponent: Todas las notificaciones eliminadas');
          this.closeNotificationPanel();
        },
        error: (error) => {
          console.error('❌ HeaderComponent: Error eliminando notificaciones:', error);
          // Fallback al método legacy si falla
          this.authService.clearNotifications();
        }
      });
  }

  /**
   * Marca todas las notificaciones como leídas
   */
  public markAllNotificationsAsRead(): void {
    console.log('📚 HeaderComponent: Marcando todas las notificaciones como leídas');
    
    this.notificationsService.markAllAsRead()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => console.log('✅ HeaderComponent: Todas las notificaciones marcadas como leídas'),
        error: (error) => console.error('❌ HeaderComponent: Error marcando como leídas:', error)
      });
  }

  /**
   * Navega a la misma URL refrescando el componente (método legacy mantenido)
   */
  public routerLinkSameUrl(path: string | undefined): void {
    if (!path) return;
    
    console.log(`🔗 HeaderComponent: Navegando a ${path} con refresh`);
    
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigateByUrl(path);
    });
  }

  /**
   * Obtiene la clase CSS para el icono de notificaciones según el estado
   */
  public getNotificationIconClass(): string {
    // La clase base siempre incluye el icono de campana
    return 'large bell icon outline h-100';
  }

  /**
   * Verifica si debe mostrarse el badge de notificaciones no leídas
   */
  public shouldShowNotificationBadge(): boolean {
    // El badge se controlará via el observable unreadCount$
    return false; // El template usará *ngIf con el observable
  }

  /**
   * Maneja clics fuera del panel para cerrarlo
   */
  public handleClickOutside(event: Event): void {
    // Esta funcionalidad se maneja en el componente NotificationsPanel
    // mediante el overlay, pero mantenemos el método por compatibilidad
    this.closeNotificationPanel();
  }
}
