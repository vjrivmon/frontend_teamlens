import { Component, Input, OnInit, OnChanges, OnDestroy, SimpleChanges, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { ProgressBarModule } from 'primeng/progressbar';
import { Router } from '@angular/router';

/**
 * Interfaz para representar un rol de Belbin con su puntuación
 */
interface BelbinRole {
  [key: string]: number;
}

/**
 * Interfaz para la información detallada de cada rol
 */
interface RoleInfo {
  name: string;
  category: string;
  description: string;
  strengths: string;
  weaknesses: string;
  icon: string;
  color: string;
}

/**
 * Componente para mostrar los resultados detallados del test de Belbin
 * Muestra el perfil dominante, roles secundarios y explicaciones completas
 * siguiendo las especificaciones oficiales de Belbin.com
 */
@Component({
  selector: 'app-belbin-result',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    ButtonModule,
    CardModule,
    TagModule,
    DividerModule,
    ProgressBarModule
  ],
  templateUrl: './belbin-result.component.html',
  styleUrl: './belbin-result.component.css'
})
export class BelbinResultComponent implements OnInit, OnChanges, OnDestroy {
  /**
   * Visibilidad del modal de resultados
   */
  @Input() visible: boolean = false;

  /**
   * Resultado principal (código del rol dominante)
   */
  @Input() primaryRole: string = '';

  /**
   * Array con todos los roles y sus puntuaciones
   */
  @Input() allRoles: BelbinRole[] = [];

  /**
   * Email del usuario (opcional)
   */
  @Input() userEmail: string = '';

  /**
   * Evento emitido cuando se cierra el modal
   */
  @Output() onClose = new EventEmitter<void>();

  /**
   * Contador para redirección automática
   */
  redirectCountdown: number = 30;
  private countdownInterval: any;

  /**
   * Datos calculados para mostrar
   */
  processedData: {
    primaryRole: RoleInfo;
    primaryScore: number;
    secondaryRoles: { role: RoleInfo; score: number }[];
    allOtherRoles: { role: RoleInfo; score: number; passesThreshold: boolean }[];
    maxScore: number;
  } | null = null;

  /**
   * Umbrales mínimos para cada rol de Belbin
   * Solo se muestran los roles que superen estos umbrales
   */
  private readonly roleThresholds: { [key: string]: number } = {
    'CW': 12,  // Coordinador
    'CH': 11,  // Presidente
    'SH': 14,  // Impulsor
    'PL': 9,   // Cerebro
    'RI': 10,  // Investigador de Recursos
    'ME': 10,  // Evaluador
    'TW': 13,  // Cohesionador
    'CF': 7,   // Finalizador
    'IM': 10,  // Implementador (por si acaso)
    'SP': 10,  // Especialista (por si acaso)
    'CO': 12   // Coordinador alternativo (por si acaso)
  };

  /**
   * Información detallada de todos los roles de Belbin
   * Basada en la información oficial de belbin.com
   */
  private readonly roleDefinitions: { [key: string]: RoleInfo } = {
    'SH': {
      name: 'Impulsor (Shaper)',
      category: 'Roles de Acción',
      description: 'Dinámico, enérgico y desafiante. Prospera bajo presión y tiene el impulso y coraje para superar obstáculos.',
      strengths: 'Competitivo, decidido, orientado a objetivos. Mantiene al equipo enfocado y en movimiento hacia las metas.',
      weaknesses: 'Puede ser impaciente, provocativo y a veces herir los sentimientos de otros en su afán de conseguir resultados.',
      icon: 'pi pi-bolt',
      color: '#e74c3c'
    },
    'CO': {
      name: 'Coordinador (Co-ordinator)',
      category: 'Roles Sociales',
      description: 'Maduro, confiado, identifica el talento. Clarifica objetivos y delega efectivamente.',
      strengths: 'Excelente para dirigir equipos diversos, facilita reuniones y discusiones, promueve el consenso.',
      weaknesses: 'Puede ser visto como manipulador y podría delegar demasiado su propia carga de trabajo.',
      icon: 'pi pi-users',
      color: '#3498db'
    },
    'PL': {
      name: 'Cerebro (Plant)',
      category: 'Roles de Pensamiento',
      description: 'Creativo, imaginativo, pensador libre. Genera ideas y resuelve problemas difíciles de manera poco convencional.',
      strengths: 'Altamente innovador, encuentra soluciones originales a problemas complejos, piensa fuera de la caja.',
      weaknesses: 'Puede ignorar detalles importantes y estar demasiado absorto para comunicarse efectivamente.',
      icon: 'pi pi-lightbulb',
      color: '#9b59b6'
    },
    'RI': {
      name: 'Investigador de Recursos (Resource Investigator)',
      category: 'Roles Sociales',
      description: 'Extrovertido, entusiasta. Explora oportunidades y desarrolla contactos externos.',
      strengths: 'Excelente comunicador, natural negociador, mantiene buenas relaciones externas y encuentra nuevas oportunidades.',
      weaknesses: 'Puede ser demasiado optimista y perder interés una vez que pasa el entusiasmo inicial.',
      icon: 'pi pi-search',
      color: '#f39c12'
    },
    'ME': {
      name: 'Evaluador (Monitor Evaluator)',
      category: 'Roles de Pensamiento',
      description: 'Sobrio, estratégico y perspicaz. Ve todas las opciones y juzga con precisión.',
      strengths: 'Excelente capacidad analítica, toma decisiones objetivas e imparciales, evalúa pros y contras cuidadosamente.',
      weaknesses: 'Puede carecer de impulso para inspirar a otros y ser demasiado crítico, lento en la toma de decisiones.',
      icon: 'pi pi-chart-line',
      color: '#34495e'
    },
    'IM': {
      name: 'Implementador (Implementer)',
      category: 'Roles de Acción',
      description: 'Práctico, confiable, eficiente. Convierte las ideas en acciones y organiza el trabajo que necesita hacerse.',
      strengths: 'Altamente organizado, leal, trabaja sistemáticamente, convierte planes en acciones concretas.',
      weaknesses: 'Puede ser algo inflexible y lento para responder a nuevas posibilidades o cambios.',
      icon: 'pi pi-cog',
      color: '#27ae60'
    },
    'TW': {
      name: 'Cohesionador (Teamworker)',
      category: 'Roles Sociales',
      description: 'Cooperativo, perceptivo y diplomático. Escucha y evita la fricción en el equipo.',
      strengths: 'Excelente mediador, mantiene la armonía del equipo, flexible y adaptable, gran capacidad de escucha.',
      weaknesses: 'Puede ser indeciso en situaciones críticas y tiende a evitar la confrontación necesaria.',
      icon: 'pi pi-heart',
      color: '#1abc9c'
    },
    'CF': {
      name: 'Finalizador (Completer Finisher)',
      category: 'Roles de Acción',
      description: 'Meticuloso, concienzudo, ansioso. Busca errores y los pulir hasta la perfección.',
      strengths: 'Atención excepcional al detalle, asegura la calidad y precisión, cumple con los plazos establecidos.',
      weaknesses: 'Puede preocuparse excesivamente y ser reacio a delegar, perfeccionista hasta el extremo.',
      icon: 'pi pi-check-circle',
      color: '#e67e22'
    },
    'SP': {
      name: 'Especialista (Specialist)',
      category: 'Roles de Pensamiento',
      description: 'Decidido, autónomo y dedicado. Aporta conocimientos y habilidades especializadas.',
      strengths: 'Experto en conocimiento técnico, se dedica a dominar su área de especialización, mentor técnico.',
      weaknesses: 'Solo contribuye en un frente específico y tiende a centrarse demasiado en aspectos técnicos.',
      icon: 'pi pi-star',
      color: '#8e44ad'
    }
  };

  constructor(private router: Router) {}

  ngOnInit() {
    console.log('🚀🚀🚀 [BelbinResult] VERSIÓN 2.1 ROLES PREDOMINANTES - CACHE BUST v2025.09.19.11:30 🚀🚀🚀');
    console.log('🔧 [BelbinResult] ngOnInit - visible:', this.visible, 'allRoles:', this.allRoles?.length);
    this.processRoleData();
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('🚀🚀🚀 [BelbinResult] VERSIÓN 2.1 ROLES PREDOMINANTES - CACHE BUST v2025.09.19.11:30 🚀🚀🚀');
    console.log('🔄 [BelbinResult] ngOnChanges detectado:', changes);
    if (changes['allRoles'] || changes['visible']) {
      console.log('🔧 [BelbinResult] Cambios detectados - visible:', this.visible, 'allRoles:', this.allRoles?.length);
      if (this.visible && this.allRoles && this.allRoles.length > 0) {
        console.log('✅✅✅ [BelbinResult] EJECUTANDO NUEVA LÓGICA DE UMBRALES V2.0 ✅✅✅');
        this.processRoleData();
        this.startCountdown();
      } else if (!this.visible) {
        this.stopCountdown();
      }
    }
  }

  /**
   * Procesa los datos de roles para generar información detallada
   */
  private processRoleData(): void {
    console.log('🔧 [BelbinResult] processRoleData llamado con:', this.allRoles);

    try {
      if (!this.allRoles || this.allRoles.length === 0) {
        console.log('❌ [BelbinResult] No hay roles para procesar');
        return;
      }

      console.log('🔍 [BelbinResult] NUEVA LÓGICA DE UMBRALES ACTIVADA');

      // NUEVA LÓGICA: Convertir a formato más simple
      const rolesWithScores = this.allRoles.map(roleData => {
        const roleCode = Object.keys(roleData)[0];
        const score = Object.values(roleData)[0] as number;
        const threshold = this.roleThresholds[roleCode] || 0;
        const roleInfo = this.roleDefinitions[roleCode];

        console.log(`📊 [BelbinResult] ${roleCode}: ${score} (umbral: ${threshold}) - ${roleInfo ? 'DEFINIDO' : 'NO_DEFINIDO'}`);

        return {
          code: roleCode,
          score: score,
          threshold: threshold,
          roleInfo: roleInfo,
          passesThreshold: score >= threshold
        };
      }).filter(item => item.roleInfo); // Solo roles definidos

      // Filtrar los que superan umbral
      const rolesAboveThreshold = rolesWithScores.filter(item => item.passesThreshold);

      console.log(`✅ [BelbinResult] ${rolesAboveThreshold.length} de ${rolesWithScores.length} roles superan umbrales`);

      if (rolesAboveThreshold.length === 0) {
        console.log('⚠️ [BelbinResult] Ningún rol supera umbral - usando rol principal sin filtro');
        const primaryItem = rolesWithScores[0];
        const otherItems = rolesWithScores.slice(1);

        this.processedData = {
          primaryRole: primaryItem.roleInfo,
          primaryScore: primaryItem.score,
          secondaryRoles: [],
          allOtherRoles: otherItems.map(item => ({
            role: item.roleInfo,
            score: item.score,
            passesThreshold: item.passesThreshold
          })),
          maxScore: primaryItem.score
        };
        return;
      }

      // Usar roles que superan umbral
      const primaryItem = rolesAboveThreshold[0];
      const secondaryItems = rolesAboveThreshold.slice(1);

      // NUEVA FUNCIONALIDAD: Incluir TODOS los demás roles (no solo los que superan umbral)
      const allOtherItems = rolesWithScores
        .filter(item => item.code !== primaryItem.code)
        .map(item => ({
          role: item.roleInfo,
          score: item.score,
          passesThreshold: item.passesThreshold
        }))
        .sort((a, b) => b.score - a.score); // Ordenar por puntuación

      this.processedData = {
        primaryRole: primaryItem.roleInfo,
        primaryScore: primaryItem.score,
        secondaryRoles: secondaryItems.map(item => ({
          role: item.roleInfo,
          score: item.score
        })),
        allOtherRoles: allOtherItems,
        maxScore: primaryItem.score
      };

      console.log('✅ [BelbinResult] NUEVA LÓGICA APLICADA:', {
        primary: `${primaryItem.code} (${primaryItem.score})`,
        secondary: secondaryItems.map(i => `${i.code} (${i.score})`),
        total: rolesAboveThreshold.length
      });

    } catch (error) {
      console.error('❌ [BelbinResult] ERROR en processRoleData:', error);
      // Fallback a lógica anterior en caso de error
      this.processOldData();
    }
  }

  /**
   * Fallback: procesar con lógica anterior si hay error
   */
  private processOldData(): void {
    console.log('🔄 [BelbinResult] Usando lógica de fallback');
    if (!this.allRoles || this.allRoles.length === 0) return;

    const primaryRoleData = this.allRoles[0];
    const primaryRoleCode = Object.keys(primaryRoleData)[0];
    const maxScore = Object.values(primaryRoleData)[0] as number;
    const primaryRole = this.roleDefinitions[primaryRoleCode];

    if (!primaryRole) return;

    const secondaryRoles = this.allRoles.slice(1).map(roleData => {
      const roleCode = Object.keys(roleData)[0];
      const score = Object.values(roleData)[0] as number;

      return {
        role: this.roleDefinitions[roleCode],
        score
      };
    }).filter(item => item.role);

    this.processedData = {
      primaryRole,
      primaryScore: maxScore,
      secondaryRoles,
      allOtherRoles: secondaryRoles.map(item => ({
        role: item.role,
        score: item.score,
        passesThreshold: false // En fallback asumimos que no sabemos si pasan umbral
      })),
      maxScore
    };
  }

  /**
   * FUNCIÓN DESHABILITADA - Ya no se usan porcentajes
   * Ahora mostramos valores numéricos directos con umbrales
   */
  getStrengthPercentage(score: number): number {
    console.log('⚠️ [BelbinResult] getStrengthPercentage DESHABILITADA - usando valores numéricos');
    return 0; // Siempre retorna 0 para forzar uso de valores numéricos
  }

  /**
   * Obtiene la clase CSS para la categoría de rol
   */
  getCategoryClass(category: string): string {
    switch (category) {
      case 'Roles de Acción': return 'category-action';
      case 'Roles Sociales': return 'category-social';
      case 'Roles de Pensamiento': return 'category-thinking';
      default: return '';
    }
  }

  /**
   * Inicia el contador de redirección automática
   */
  private startCountdown(): void {
    this.redirectCountdown = 30;
    console.log('⏰ [BelbinResult] Iniciando contador de 30 segundos...');
    
    this.countdownInterval = setInterval(() => {
      this.redirectCountdown--;
      console.log('⏱️ [BelbinResult] Countdown:', this.redirectCountdown);
      
      if (this.redirectCountdown <= 0) {
        console.log('⏰ [BelbinResult] Tiempo agotado, redirigiendo automáticamente...');
        this.performRedirect();
      }
    }, 1000);
  }

  /**
   * Detiene el contador de redirección
   */
  private stopCountdown(): void {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
      console.log('⏹️ [BelbinResult] Contador detenido');
    }
  }

  /**
   * Realiza la redirección al dashboard
   */
  private performRedirect(): void {
    this.stopCountdown();
    this.onClose.emit();
    
    // CORRECCIÓN: Redirigir al dashboard correcto (no /teacher/dashboard)
    console.log('🎯 [BelbinResult] Redirigiendo al dashboard...');
    this.router.navigateByUrl('/dashboard');
  }

  /**
   * Maneja el cierre manual del modal
   */
  onCloseModal(): void {
    console.log('🚪 [BelbinResult] Cierre manual del modal...');
    this.performRedirect();
  }

  /**
   * Limpia recursos al destruir el componente
   */
  ngOnDestroy(): void {
    this.stopCountdown();
  }
} 