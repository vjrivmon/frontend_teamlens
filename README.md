# Teamlens. Frontend repository.

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 17.1.0.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Project Structure

```
.angular/
.cache/
.editorconfig
.gitignore
.vscode/
angular.json
package.json
README.md
src/
  app/
    app.component.css
    app.component.html
    app.component.spec.ts
    app.component.ts
    app.config.ts
    app.routes.ts
    directives/
    guards/
    interceptors/
    layout/
    models/
    pages/
    services/
  assets/
    .gitkeep
    Semantic-UI-CSS-master/
  index.html
  main.ts
  styles.css
tsconfig.app.json
tsconfig.json
tsconfig.spec.json
```

## Key files

**Configuration Files**:
  [`angular.json`]: Main configuration file for Angular CLI, defining build, serve, and test configurations.
  
  [`tsconfig.json`], [`tsconfig.app.json`], [`tsconfig.spec.json`]: TypeScript configuration files for the application, application-specific settings, and test settings, respectively.
  
  [`.editorconfig`], [`.gitignore`], [`.vscode/`]: Configuration files for the editor and version control.

**Source Code**:
  [`src/`]: Main source directory.
    [`app/`]: Contains the core application code.
      [`app.component.ts`]: Root component of the application.
      [`app.config.ts`]: Application-wide configuration, including providers and routes.
      [`app.routes.ts`]: Defines the routes for the application.
      [`services/`]: Contains service classes like [`ActivitiesService`] and [`AuthService`].
      [`models/`]: Defines TypeScript interfaces and models used throughout the application.
      [`pages/`]: Contains feature modules and components, organized by functionality (e.g., [`teacher`], [`dashboard`], [`create-activity`]).
      [`directives/`], `guards/`, [`interceptors/`]: Custom directives, route guards, and HTTP interceptors.
      [`layout/`]: Contains layout components like [`HeaderComponent`].

## Key Components and Services

**Root Component**:
  [`AppComponent`]: The root component that bootstraps the application.

**Routing**:
  [`app.routes.ts`]: Defines the routes for the application, enabling navigation between different views.

**Services**:
  [`ActivitiesService`]: Manages activities-related operations.
  [`AuthService`]: Handles authentication and user management.

**Feature Components**:
  [`CreateActivityComponent`]: Allows teachers to create new activities.
  [`DashboardComponent`]: Displays an overview of activities and questionnaires for the logged-in user.

## Forms and Validation

**Reactive Forms**:
  The project uses Angular's Reactive Forms for form handling and validation, as seen in [`CreateActivityComponent`].

## Custom Directives

**TeacherOnlyDirective**:

The [`TeacherOnlyDirective`] is used to conditionally display elements based on the user's role. It hides the element by default and then checks the user's role using the [`AuthService`]. If the user has a role of "teacher", the element is displayed.

- **File**: [`src/app/directives/teacher-only.ts`]
- **Usage**: 
  ```html
  <button teacherOnly (click)="addStudentsButton()" class="ui button primary">
      <i class="pi pi-user-plus mr-2"></i>
      Add students to the activity
  </button>
  ```

**StudentOnlyDirective**

The [`StudentOnlyDirective`] is similar to the [`TeacherOnlyDirective`], but it displays elements only if the user has a role of "student".

- **File**: [`src/app/directives/student-only.ts`]
- **Usage**: 
  ```html
  <div studentOnly>
      <div class="flex align-items-center">
          <div>
              <h2>Groups</h2>
              <p>Here you can see all the groups.</p>
          </div>
      </div>
  </div>
  ```

## Interceptors

**HttpRequestInterceptor**:

The [`HttpRequestInterceptor`] to each request.

- **File**: [`src/app/interceptors/http.interceptor.ts`]
- **Usage**: Registered globally in the application configuration.
  ```ts
  import { httpInterceptorProviders } from './interceptors/http.interceptor';

  export const appConfig: ApplicationConfig = {
    providers: [
      httpInterceptorProviders,
      // other providers
    ]
  };
  ```

- **Interceptor Implementation**:
  ```ts
  @Injectable()
  export class HttpRequestInterceptor implements HttpInterceptor {
    intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
      req = req.clone({
        withCredentials: true,
        ...httpOptions
      });
      return next.handle(req);
    }
  }

  export const httpInterceptorProviders = [
    { provide: HTTP_INTERCEPTORS, useClass: HttpRequestInterceptor, multi: true },
  ];
  ```


## Third-Party Libraries

**PrimeNG**:
  The project uses PrimeNG for UI components like buttons, dialogs, and cards. These are imported and used in various components.

## Build

**Build**:
  Configured in [`angular.json`] and [`tsconfig.app.json`]. The build process compiles TypeScript to JavaScript and bundles the application for deployment.
  
## Bootstrapping

**Main Entry Point**:
  [`main.ts`]: Bootstraps the application using [`bootstrapApplication`] with the root [`AppComponent`] and configuration from [`app.config.ts`].
