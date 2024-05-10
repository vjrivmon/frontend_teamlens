import { Routes } from '@angular/router';
import { HomeComponent } from './pages/public/home/home.component';
import { NotFoundComponent } from './pages/public/notfound/notfound.component';
import { LoginComponent } from './pages/public/login/login.component';
import { DashboardComponent } from './pages/private/dashboard/dashboard.component';
import { AuthGuard } from './guards/auth.guard';
import { ActivityDetailComponent } from './pages/private/activity-detail/activity-detail.component';
import { CreateActivityComponent } from './pages/private/create-activity/create-activity.component';
import { CreateGroupComponent } from './pages/private/create-group/create-group.component';
import { GroupDetailComponent } from './pages/private/group-detail/group-detail.component';

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
    //Protected Routes
    {
        path: 'dashboard',
        component: DashboardComponent,
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
            {
                path: ':id/create-group',
                component: CreateGroupComponent
            },
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
