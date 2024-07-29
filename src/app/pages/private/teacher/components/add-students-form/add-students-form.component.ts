import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChipsModule } from 'primeng/chips';
import { ButtonModule } from 'primeng/button';
import { AuthService } from '../../../../../services/auth.service'

@Component({
  selector: 'app-add-students-form',
  standalone: true,
  imports: [FormsModule, ChipsModule, ButtonModule],
  templateUrl: './add-students-form.component.html',
  styleUrl: './add-students-form.component.css'
})
export class AddStudentsFormComponent {

  emailList: string[] = [];

  @Output() onAddStudents = new EventEmitter<string[]>();

  constructor() { }

  addStudentsEvent(emails: string[]) {
    this.emailList = [];
    emails = emails.map(email => email.trim());
    this.onAddStudents.emit(emails);
  }

}
