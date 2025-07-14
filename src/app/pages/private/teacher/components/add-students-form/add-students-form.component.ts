import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-add-students-form',
  standalone: true,
  imports: [FormsModule, ButtonModule, InputTextModule, CommonModule],
  templateUrl: './add-students-form.component.html',
  styleUrl: './add-students-form.component.css'
})
export class AddStudentsFormComponent {

  emailList: string[] = [];
  emailInput: string = '';

  @Output() onAddStudents = new EventEmitter<string[]>();

  constructor() { }

  /**
   * Agrega un email cuando se presiona Enter
   */
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.addCurrentEmail();
    }
  }

  /**
   * Procesa el input cuando hay espacios o comas
   */
  onInputChange(): void {
    if (this.emailInput.includes(' ') || this.emailInput.includes(',')) {
      this.processMultipleEmails();
    }
  }

  /**
   * Procesa múltiples emails separados por espacios o comas
   */
  processMultipleEmails(): void {
    const emails = this.emailInput
      .split(/[,\s]+/)
      .map(email => email.trim())
      .filter(email => email.length > 0 && email.includes('@'));

    emails.forEach(email => {
      if (!this.emailList.includes(email)) {
        this.emailList.push(email);
      }
    });

    this.emailInput = '';
  }

  /**
   * Agrega el email actual si es válido
   */
  addCurrentEmail(): void {
    const email = this.emailInput.trim();
    if (email && email.includes('@') && !this.emailList.includes(email)) {
      this.emailList.push(email);
      this.emailInput = '';
    }
  }

  /**
   * Elimina un email de la lista
   */
  removeEmail(email: string): void {
    this.emailList = this.emailList.filter(e => e !== email);
  }

  /**
   * Cancela o envía los emails
   */
  addStudentsEvent(emails: string[]): void {
    this.emailList = [];
    this.emailInput = '';
    this.onAddStudents.emit(emails);
  }
}
