import { Component } from '@angular/core';
import { LoginFormComponent } from '../components/login-form/login-form.component';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    LoginFormComponent
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  
  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit(): void {
    this.authService.isLoggedIn.subscribe(
      isLoggedIn => {
        if (isLoggedIn) {
          this.router.navigateByUrl('/dashboard');
        }
      }
    );
  }
  
}
