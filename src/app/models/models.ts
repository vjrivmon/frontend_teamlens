export interface IUser {
    _id: string;
    email: string;
    role: string;
    traits?: string[];
    name?: string;
    lastName?: string;
    birthDate?: string;
    invitationToken?: string;
    resetToken?: string;
    gender?: string;
    activities?: IActivity[];
    askedQuestionnaires: TQuestionnaireResult[];
    groups?: IGroup[];
    notifications?: INotification[];
}

/**
 * Modelo de Notificación Enterprise
 * 
 * Estructura avanzada que soporta gestión granular, categorización
 * y seguimiento completo del estado de las notificaciones
 */
export interface INotification {
    _id: string;
    title: string;
    description: string;
    link?: string;
    date?: Date;
    timestamp?: Date;
    
    // Nuevas propiedades para funcionalidad enterprise
    read?: boolean;                           // Estado de lectura
    type?: 'activity' | 'group' | 'system';  // Categorización inteligente
    priority?: 'high' | 'normal' | 'low';    // Sistema de prioridades
    icon?: string;                           // Icono específico para cada tipo
    expiresAt?: Date;                        // Fecha de expiración automática
    actionRequired?: boolean;                // Indica si requiere acción del usuario
    metadata?: {                             // Metadatos adicionales para contexto
        activityId?: string;
        groupId?: string;
        senderId?: string;
        [key: string]: any;
    };
}


export interface IQuestionnaire {
    _id: string;
    title: string;
    description: string;
    questions: TQuestion[];
    questionnaireType: string;
    enabled: boolean;
}

export interface IActivity {
    _id: string;
    title: string;
    description: string;
    startDate?: number;
    finishDate?: number;
    teacher: IUser;
    students?: IUser[];
    groups?: IGroup[];
    algorithmStatus?: string;
}

export interface IGroup {
    _id: string;
    name: string;
    students: IUser[];
    status?: 'draft' | 'confirmed'; // Estado del grupo
    creationMethod?: 'manual' | 'algorithm'; // Método de creación
    createdAt?: string;
    confirmedAt?: string;
    confirmedBy?: string;
    metadata?: {
        algorithmVersion?: string;
        taskId?: string;
        teamSize?: number;
        [key: string]: any;
    };
}

export interface INewActivity extends Omit<IActivity, '_id'  | 'teacher' | 'students' | 'groups'> {

};
export interface INewGroup extends Omit<IGroup, '_id'  | 'students'> {
    students: string[]; // only need the ids
};

export type TQuestion = {
    _id: string;
    question: string;
    type: 'MultipleChoice' | 'OpenText' | 'Rating' | 'Distribution';
    options?: string[];
}

export type TQuestionnaireResult = {
    questionnaire: string;
    result: string;
}

/**
 * Interfaz para las estadísticas de completitud de cuestionarios
 * Utilizada para mostrar el progreso de respuestas en las actividades
 */
export interface IQuestionnaireStats {
    questionnaireId: string;
    questionnaireTitle: string;
    questionnaireType: string;
    totalStudents: number;
    completedCount: number;
    completionPercentage: number;
}