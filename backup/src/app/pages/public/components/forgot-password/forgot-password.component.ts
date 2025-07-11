import { Component } from '@angular/core';
import { AuthService } from '../../../../services/auth.service';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';


@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css'
})
export class ForgotPasswordComponent {

  email: string = "";

  constructor(private authService: AuthService, private messageService: MessageService) { }

  onSubmit(event: any) {

    event.preventDefault();
    
    console.log('email', this.email);

    // Submit the form
    this.authService.forgotPassword(this.email, {

      done: (res: any) => {
        // Handle the response     
        console.log(res);
        this.email = "";
        this.messageService.add({ severity: 'info', summary: 'Email sent', detail: 'Reset passswor email sent successfully to ' + this.email, life: 3000 });
      },
      err: (error: any) => {
        this.messageService.add({ severity: 'error', summary: 'Ops', detail: 'Something was wrong', life: 3000 });
      }

    });
  }

}
