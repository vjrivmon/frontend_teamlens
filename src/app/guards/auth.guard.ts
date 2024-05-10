import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

export const AuthGuard: CanActivateFn = (route, state) => {
  
  const router = inject(Router);

  if (!localStorage.getItem('token')) {
    router.navigateByUrl('/login');
    return false;
  }
  return true;
};
