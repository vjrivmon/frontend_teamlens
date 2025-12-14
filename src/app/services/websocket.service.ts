import { Injectable, inject } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { BehaviorSubject, Observable, timer, interval } from 'rxjs';
import { map } from 'rxjs/operators';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

export interface WebSocketConnectionInfo {
  connected: boolean;
  userId?: string;
  connectedAt?: Date;
  lastPing?: Date;
  reconnectAttempts?: number;
}

/**
 * 🌐 Servicio WebSocket para TeamLens
 * 
 * Proporciona comunicación en tiempo real entre frontend y backend
 * con reconexión automática y gestión inteligente de eventos.
 * 
 * Características:
 * - Conexión automática con autenticación JWT
 * - Reconexión automática en caso de fallos
 * - Gestión centralizada de eventos de notificaciones
 * - Heartbeat para mantener conexión activa
 * - Fallback automático a polling cuando sea necesario
 */
@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  
  private socket: Socket | null = null;
  private readonly API_URL = this.getWebSocketUrl();
  private readonly MAX_RECONNECT_ATTEMPTS = 5;
  private readonly RECONNECT_DELAY = 5000; // 5 segundos
  private readonly HEARTBEAT_INTERVAL = 60000; // 60 segundos
  private readonly MAX_BACKOFF_DELAY = 30000; // 30 segundos máximo
  
  // Estado interno para controlar reconexiones
  private isReconnecting = false;
  private connectionTimeout: any;
  private isDestroyed = false;
  
  private authService = inject(AuthService);

  /**
   * Obtiene la URL correcta para WebSocket según el entorno
   */
  private getWebSocketUrl(): string {
    if (environment.production) {
      // En producción, usar la URL completa del servidor actual
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      return `${window.location.protocol}//${window.location.host}`;
    } else {
      // En desarrollo, usar la URL del environment
      return environment.apiUrl;
    }
  }
  
  // Estado de la conexión
  private connectionInfoSubject = new BehaviorSubject<WebSocketConnectionInfo>({
    connected: false,
    reconnectAttempts: 0
  });
  
  // Observables públicos
  public readonly connectionInfo$ = this.connectionInfoSubject.asObservable();
  public readonly connected$ = this.connectionInfo$.pipe(
    map(info => info.connected)
  );

  // Subject para eventos de notificaciones
  private notificationEventsSubject = new BehaviorSubject<any>(null);
  public readonly notificationEvents$ = this.notificationEventsSubject.asObservable();

  constructor() {
    console.log('🌐 WebSocketService: Inicializando servicio WebSocket');
    this.initializeConnection();
  }

  /**
   * Inicializa la conexión WebSocket
   */
  private initializeConnection(): void {
    // Verificar si el usuario está autenticado
    const currentUser = this.authService.getUser();
    const token = sessionStorage.getItem('token');
    
    if (currentUser && token) {
      console.log('🔐 WebSocketService: Usuario autenticado, estableciendo conexión...');
      this.connect(token);
    } else {
      console.log('⚠️ WebSocketService: Usuario no autenticado, esperando login...');
      
      // Escuchar cambios en el estado de autenticación
      this.authService.loggedUser.subscribe((user: any) => {
        const currentToken = sessionStorage.getItem('token');
        if (user && currentToken && !this.isConnected()) {
          console.log('🔐 WebSocketService: Usuario autenticado, conectando...');
          this.connect(currentToken);
        } else if (!user && this.isConnected()) {
          console.log('🔓 WebSocketService: Usuario desautenticado, desconectando...');
          this.disconnect();
        }
      });
    }
  }

  /**
   * Establece conexión WebSocket con el servidor
   */
  public connect(token: string): void {
    if (this.socket && this.socket.connected) {
      console.log('🌐 WebSocketService: Ya conectado, ignorando nueva conexión');
      return;
    }

    console.log('🔗 WebSocketService: Estableciendo conexión con token...');
    console.log('🔐 WebSocketService: Token (primeros 50 chars):', token?.substring(0, 50) + '...');
    console.log('🔐 WebSocketService: Token length:', token?.length);

    try {
      this.socket = io(this.API_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        timeout: 10000,
        retries: this.MAX_RECONNECT_ATTEMPTS
      });

      this.setupEventListeners();
      this.startHeartbeat();

    } catch (error: any) {
      console.error('❌ WebSocketService: Error estableciendo conexión:', error);
      this.updateConnectionInfo({ connected: false });
    }
  }

  /**
   * Configura los listeners de eventos WebSocket
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Evento de conexión exitosa
    this.socket.on('connect', () => {
      console.log('✅ WebSocketService: Conectado exitosamente');
      this.updateConnectionInfo({
        connected: true,
        connectedAt: new Date(),
        reconnectAttempts: 0
      });
    });

    // Evento de desconexión
    this.socket.on('disconnect', (reason: string) => {
      console.log(`📤 WebSocketService: Desconectado - ${reason}`);
      this.updateConnectionInfo({ connected: false });
      
      // Intentar reconexión automática
      if (reason !== 'io client disconnect') {
        this.attemptReconnection();
      }
    });

    // Evento de error de conexión
    this.socket.on('connect_error', (error: any) => {
      const currentInfo = this.connectionInfoSubject.value;
      const attempts = currentInfo.reconnectAttempts || 0;
      
      // Solo imprimir errores críticos para evitar spam en consola
      if (attempts <= 2) {
        console.error('❌ WebSocketService: Error de conexión:', error.message || error);
      } else if (attempts === this.MAX_RECONNECT_ATTEMPTS) {
        console.error('❌ WebSocketService: Error persistente después de múltiples intentos');
      }
      
      this.updateConnectionInfo({ connected: false });
    });

    // ================================
    // EVENTOS DE NOTIFICACIONES
    // ================================

    // Nueva notificación recibida
    this.socket.on('new-notification', (data: any) => {
      console.log('🔔 WebSocketService: Nueva notificación recibida:', data);
      this.notificationEventsSubject.next({
        type: 'new-notification',
        data: data,
        timestamp: new Date()
      });
    });

    // Notificación marcada como leída
    this.socket.on('notification-read', (data: any) => {
      console.log('📖 WebSocketService: Notificación marcada como leída:', data);
      this.notificationEventsSubject.next({
        type: 'notification-read',
        data: data,
        timestamp: new Date()
      });
    });

    // Notificación eliminada
    this.socket.on('notification-deleted', (data: any) => {
      console.log('🗑️ WebSocketService: Notificación eliminada:', data);
      this.notificationEventsSubject.next({
        type: 'notification-deleted',
        data: data,
        timestamp: new Date()
      });
    });

    // Todas las notificaciones marcadas como leídas
    this.socket.on('all-notifications-read', (data: any) => {
      console.log('📚 WebSocketService: Todas las notificaciones marcadas como leídas');
      this.notificationEventsSubject.next({
        type: 'all-notifications-read',
        data: data,
        timestamp: new Date()
      });
    });

    // Notificación de alta prioridad
    this.socket.on('high-priority-notification', (data: any) => {
      console.log('🚨 WebSocketService: Notificación de ALTA PRIORIDAD:', data);
      this.notificationEventsSubject.next({
        type: 'high-priority-notification',
        data: data,
        timestamp: new Date()
      });
    });

    // ================================
    // EVENTOS DE ACTIVIDADES
    // ================================

    // Nueva asignación de actividad
    this.socket.on('new-activity-assignment', (data: any) => {
      console.log('📋 WebSocketService: Nueva actividad asignada:', data);
      this.notificationEventsSubject.next({
        type: 'new-activity-assignment',
        data: data,
        timestamp: new Date()
      });
    });

    // Estado de Belbin actualizado
    this.socket.on('activity-belbin-status-updated', (data: any) => {
      console.log('📊 WebSocketService: Estado Belbin actualizado:', data);
      this.notificationEventsSubject.next({
        type: 'activity-belbin-status-updated',
        data: data,
        timestamp: new Date()
      });
    });

    // ================================
    // EVENTOS DE COLA DE EMAILS
    // ================================

    // Cola de emails iniciada
    this.socket.on('email-queue-started', (data: any) => {
      console.log('📬 WebSocketService: Cola de emails iniciada:', data);
      this.notificationEventsSubject.next({
        type: 'email-queue-started',
        data: data,
        timestamp: new Date()
      });
    });

    // Progreso de cola de emails
    this.socket.on('email-queue-progress', (data: any) => {
      console.log('📬 WebSocketService: Progreso de emails:', data);
      this.notificationEventsSubject.next({
        type: 'email-queue-progress',
        data: data,
        timestamp: new Date()
      });
    });

    // Cola de emails completada
    this.socket.on('email-queue-completed', (data: any) => {
      console.log('✅ WebSocketService: Cola de emails completada:', data);
      this.notificationEventsSubject.next({
        type: 'email-queue-completed',
        data: data,
        timestamp: new Date()
      });
    });

    // Error en cola de emails
    this.socket.on('email-queue-error', (data: any) => {
      console.log('❌ WebSocketService: Error en cola de emails:', data);
      this.notificationEventsSubject.next({
        type: 'email-queue-error',
        data: data,
        timestamp: new Date()
      });
    });

    // ================================
    // EVENTOS DEL SISTEMA
    // ================================

    // Respuesta del servidor a ping
    this.socket.on('pong', () => {
      this.updateConnectionInfo({ lastPing: new Date() });
    });
  }

  /**
   * Intenta reconexión automática con backoff exponencial
   */
  private attemptReconnection(): void {
    if (this.isReconnecting || this.isDestroyed) {
      return; // Evitar múltiples intentos simultáneos
    }

    const currentInfo = this.connectionInfoSubject.value;
    const attempts = (currentInfo.reconnectAttempts || 0) + 1;

    if (attempts <= this.MAX_RECONNECT_ATTEMPTS) {
      this.isReconnecting = true;
      
      // Backoff exponencial con máximo
      const backoffDelay = Math.min(
        this.RECONNECT_DELAY * Math.pow(2, attempts - 1),
        this.MAX_BACKOFF_DELAY
      );
      
      console.log(`🔄 WebSocketService: Reconexión en ${backoffDelay/1000}s (intento ${attempts}/${this.MAX_RECONNECT_ATTEMPTS})`);
      
      this.updateConnectionInfo({ reconnectAttempts: attempts });
      
      this.connectionTimeout = setTimeout(() => {
        if (!this.isDestroyed && (!this.socket || !this.socket.connected)) {
          console.log(`🔄 WebSocketService: Ejecutando intento de reconexión ${attempts}`);
          
          // Verificar si aún tenemos credenciales válidas
          const token = sessionStorage.getItem('token');
          const user = this.authService.getUser();
          
          if (token && user) {
            this.connect(token);
          } else {
            console.log('⚠️ WebSocketService: Sin credenciales para reconexión');
            this.isReconnecting = false;
            return;
          }
        }
        this.isReconnecting = false;
      }, backoffDelay);
      
    } else {
      console.log('🛑 WebSocketService: Máximo de intentos alcanzado - deteniendo reconexiones');
      this.isReconnecting = false;
    }
  }

  /**
   * Inicia el sistema de heartbeat para mantener la conexión activa
   */
  private startHeartbeat(): void {
    interval(this.HEARTBEAT_INTERVAL).subscribe(() => {
      if (this.isConnected()) {
        this.emit('ping', {});
      }
    });
  }

  /**
   * Emite un evento al servidor
   */
  public emit(event: string, data: any): void {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
      console.log(`📤 WebSocketService: Enviado evento '${event}'`, data);
    } else {
      console.warn(`⚠️ WebSocketService: No se puede enviar evento '${event}' - no conectado`);
    }
  }

  /**
   * Desconecta del servidor WebSocket y limpia recursos
   */
  public disconnect(): void {
    console.log('📤 WebSocketService: Desconectando y limpiando recursos...');
    
    this.isDestroyed = true;
    this.isReconnecting = false;
    
    // Limpiar timeouts
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
    
    // Desconectar socket
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.updateConnectionInfo({ 
      connected: false, 
      reconnectAttempts: 0 
    });
  }

  /**
   * Reinicia el servicio WebSocket
   */
  public restart(): void {
    console.log('🔄 WebSocketService: Reiniciando servicio...');
    this.disconnect();
    this.isDestroyed = false;
    
    // Esperar un momento antes de reinicializar
    setTimeout(() => {
      this.initializeConnection();
    }, 1000);
  }

  /**
   * Verifica si está conectado al WebSocket
   */
  public isConnected(): boolean {
    return this.socket?.connected || false;
  }

  /**
   * Obtiene información de la conexión
   */
  public getConnectionInfo(): WebSocketConnectionInfo {
    return this.connectionInfoSubject.value;
  }

  /**
   * Actualiza la información de conexión
   */
  private updateConnectionInfo(updates: Partial<WebSocketConnectionInfo>): void {
    const current = this.connectionInfoSubject.value;
    const updated = { ...current, ...updates };
    this.connectionInfoSubject.next(updated);
  }

  /**
   * Fuerza reconexión manual
   */
  public forceReconnect(): void {
    console.log('🔄 WebSocketService: Forzando reconexión...');
    
    if (this.socket) {
      this.socket.disconnect();
    }
    
    const currentUser = this.authService.getUser();
    const token = sessionStorage.getItem('token');
    if (currentUser && token) {
      this.connect(token);
    }
  }

  /**
   * Método de limpieza para destruir el servicio
   */
  public destroy(): void {
    console.log('🧹 WebSocketService: Limpiando recursos...');
    this.disconnect();
  }
} 
