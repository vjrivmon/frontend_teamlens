export interface IUser {
    id: string;
    email: string;
    name: string;
    role: string;
}

export interface IProfile {

    id: string;
    //genre: string;
    //birthdate: number;
    //notifications: string[];
    activities: IActivity[];
    groups: IGroup[];
    answeredQuestionnaires: IQuestionnaire[];
    //comments: IComment[];
}

export interface IQuestionnaire {
    id: string;
    title: string;
    description: string;
    questions: TQuestion[];
}

export interface IActivity {
    id: string;
    title: string;
    description: string;
    teacher: IUser;
    students: IUser[];
    groups: IGroup[];
}

export interface IGroup {
    id: string;
    name: string;
    members: IUser[];
}


export type TAuthUser = Omit<IUser, 'id'>;
export type TNewActivity = Omit<IActivity, 'id'  | 'teacher' | 'students' | 'groups'>;
export type TNewGroup = Omit<IGroup, 'id'>;

export type TQuestion = {
    id: string;
    statement: string;
    options: string[];
}