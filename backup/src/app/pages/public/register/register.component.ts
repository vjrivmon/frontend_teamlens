import { Component, Input } from '@angular/core';
import { RegisterFormComponent } from '../components/register-form/register-form.component';
import { Router } from '@angular/router';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    RegisterFormComponent
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  
  constructor(private authService: AuthService, private router: Router) { }

  @Input() invitationToken: string | undefined;

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
