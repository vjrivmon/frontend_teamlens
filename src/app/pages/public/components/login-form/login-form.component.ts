import { Component } from '@angular/core';
import { AuthService } from '../../../../services/auth.service';
import { Router } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-login-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './login-form.component.html',
  styleUrl: './login-form.component.css'
})
export class LoginFormComponent {

  loginForm = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  })

  constructor(private authService: AuthService, private router: Router, private formBuilder: FormBuilder) { }

  onSubmit(): void {

    const { email, password } = this.loginForm.value;

    if (this.loginForm.invalid) {
      alert('Invalid form');
      return;
    }

    // Process checkout data here    
    this.authService.login(email!, password!);
    //if OK, navigate to dashboard
    this.router.navigateByUrl('/dashboard');
  }

 
  
}
