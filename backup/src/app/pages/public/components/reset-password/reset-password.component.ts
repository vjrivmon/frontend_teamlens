import { Component, Input } from '@angular/core';
import { AuthService } from '../../../../services/auth.service';
import {FormsModule} from '@angular/forms';
import { Router } from '@angular/router';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.css'
})
export class ResetPasswordComponent {

  @Input() resetToken: string = "";

  password: string = "";
  confirmPassword: string = "";

  constructor(private authService: AuthService, private router: Router, private messageService: MessageService) { }

  onSubmit(event: any) {
    
    event.preventDefault();
    
    if (this.password !== this.confirmPassword) {
      alert('Passwords do not match');
      return;
    }

    // Submit the form
    this.authService.resetPassword(this.resetToken, this.password, {
      done: (res: any) => {
        // Handle the response     
        this.router.navigate(['/login']);
        this.messageService.add({ severity: 'info', summary: 'Password changed', detail: 'Password changed successfully', life: 3000 });
      },
      err: (error: any) => {
        this.messageService.add({ severity: 'error', summary: 'Ops', detail: 'Something was wrong', life: 3000 });
      }
    });

    

  }

}
