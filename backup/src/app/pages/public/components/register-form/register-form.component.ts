import { Component, Input } from '@angular/core';
import { AuthService } from '../../../../services/auth.service';
import { Router } from '@angular/router';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { ReactiveFormsModule } from '@angular/forms';

import * as jwt from "jwt-decode";

@Component({
  selector: 'app-register-form',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './register-form.component.html',
  styleUrl: './register-form.component.css'
})
export class RegisterFormComponent {

  registerForm = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email]],
    name: ['', [Validators.required]],
    password: ['', [Validators.required]],
    confirmPassword: ['', [Validators.required]]
  }, {
    validators: this.passwordMatchingValidatior
  })

  constructor(private authService: AuthService, private router: Router, private formBuilder: FormBuilder) { }

  @Input() invitationToken: string | undefined;

  ngOnInit(): void {
    try {

      if (this.invitationToken) {

        const payload: any = jwt.jwtDecode(this.invitationToken);

        if (payload.email) {
          this.registerForm.controls['email'].setValue(payload.email);
          this.registerForm.controls['email'].disable();
        }

      }

    } catch (error) {
      console.log(error);
    }
  }

  onSubmit(): void {

    const { name, password } = this.registerForm.value;

    const email = this.registerForm.get('email')?.value;

    if (this.registerForm.invalid) {
      alert('Invalid form');
      return;
    }

    const role = this.invitationToken ? 'student' : 'teacher';

    const callback = {
      done: () => {
        //if OK, navigate to dashboard
        this.router.navigateByUrl('/login');
      },
      err: (error: any) => {
        console.log(error)
        alert('Cannot register');
      }
    }


    // Process checkout data here    
    if (this.invitationToken) {
      this.authService.registerStudent(email!, name!, password!, role, callback);
    } else {
      this.authService.register(email!, name!, password!, role, callback);
    }
  }

  passwordMatchingValidatior(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    return password?.value === confirmPassword?.value ? null : { notmatched: true };
  };




}
