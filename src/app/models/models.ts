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

export interface INotification {

    _id: string;
    title: string;
    description: string;
    link?: string;
    date?: Date;
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