import { Routes } from '@angular/router';
import { HomeComponent } from './pages/public/home/home.component';
import { NotFoundComponent } from './pages/public/notfound/notfound.component';
import { LoginComponent } from './pages/public/login/login.component';
import { RegisterComponent } from './pages/public/register/register.component';
import { DashboardComponent } from './pages/private/teacher/dashboard/dashboard.component';
import { AuthGuard } from './guards/auth.guard';
import { ActivityDetailComponent } from './pages/private/teacher/activity-detail/activity-detail.component';
import { CreateActivityComponent } from './pages/private/teacher/create-activity/create-activity.component';
import { CreateGroupComponent } from './pages/private/teacher/create-group/create-group.component';
import { GroupDetailComponent } from './pages/private/teacher/group-detail/group-detail.component';
import { QuestionnaireFormComponent } from './pages/private/teacher/components/questionnaire-form/questionnaire-form.component';
import { ForgotPasswordComponent } from './pages/public/components/forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './pages/public/components/reset-password/reset-password.component';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
    },
    {
        path: 'home',
        component: HomeComponent
    },
    {
        path: 'login',
        component: LoginComponent
    },
    {
        path: 'register',
        component: RegisterComponent
    },
    {
        path: 'register/:invitationToken',
        component: RegisterComponent
    },
    {
        path: 'forgot-password',
        component: ForgotPasswordComponent
    },
    {
        path: 'reset-password/:resetToken',
        component: ResetPasswordComponent
    },
    //Protected Routes
    {
        path: 'dashboard',
        component: DashboardComponent,
        canActivate: [AuthGuard],

    },
    {
        path: 'questionnaire/:questionnaire_id',
        component: QuestionnaireFormComponent,
        canActivate: [AuthGuard],

    },
    {
        path: 'activities',
        canActivate: [AuthGuard],
        children: [
            {
                path: 'new',
                component: CreateActivityComponent
            },
            {
                path: ':id',
                component: ActivityDetailComponent
            },
            // {
            //     path: ':id/create-group',
            //     component: CreateGroupComponent
            // },
            {
                path: ':id/:group_id',
                component: GroupDetailComponent
            }
        ]
    },

    //Wild Card Route for 404 request
    {
        path: 'NotFound',
        pathMatch: 'full',
        component: NotFoundComponent
    },
    {
        path: '**',
        pathMatch: 'full',
        redirectTo: 'home',
        //component: NotFoundComponent
    }
];
