import { Component, EventEmitter, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ChipsModule } from 'primeng/chips';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { AuthService } from '../../../../../services/auth.service'

@Component({
  selector: 'app-add-students-form',
  standalone: true,
  imports: [FormsModule, ChipsModule, ButtonModule, InputTextModule],
  templateUrl: './add-students-form.component.html',
  styleUrl: './add-students-form.component.css'
})
export class AddStudentsFormComponent {

  emailList: string[] = [];
  emailInput: string = '';

  @Output() onAddStudents = new EventEmitter<string[]>();

  constructor() { }

  /**
   * Procesa el input de emails separados por comas, espacios o saltos de línea
   * @param input String con emails separados
   * @returns Array de emails válidos y únicos
   */
  processEmailInput(input: string): string[] {
    if (!input.trim()) return [];
    
    // Reemplazar múltiples separadores por una coma única
    const normalizedInput = input
      .replace(/[,\s\n\r\t]+/g, ',') // Reemplazar comas, espacios, saltos de línea y tabs por coma
      .replace(/^,+|,+$/g, '') // Remover comas al inicio y final
      .replace(/,+/g, ','); // Reemplazar múltiples comas consecutivas por una sola
    
    if (!normalizedInput) return [];
    
    // Dividir por comas y procesar cada email
    const emails = normalizedInput
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0)
      .filter(email => this.isValidEmail(email));
    
    // Remover duplicados manteniendo el orden
    return [...new Set(emails)];
  }

  /**
   * Valida si un string es un email válido
   * @param email String a validar
   * @returns boolean indicando si es un email válido
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Maneja la entrada de texto en el campo de emails
   * Permite pegar texto con múltiples emails separados por diversos caracteres
   */
  onEmailInputChange(event: any): void {
    // Usar setTimeout para asegurar que el valor se actualice después del paste
    setTimeout(() => {
      const inputValue = event.target.value;
      const processedEmails = this.processEmailInput(inputValue);
      
      if (processedEmails.length > 0) {
        // Agregar emails procesados a la lista existente, evitando duplicados
        const combinedEmails = [...new Set([...this.emailList, ...processedEmails])];
        this.emailList = combinedEmails;
        
        // Limpiar el input después de procesar
        this.emailInput = '';
        event.target.value = '';
      }
    }, 10);
  }

  /**
   * Maneja el evento de pegado específicamente
   * @param event Evento de pegado
   */
  onEmailInputPaste(event: ClipboardEvent): void {
    setTimeout(() => {
      const target = event.target as HTMLInputElement;
      const inputValue = target.value;
      const processedEmails = this.processEmailInput(inputValue);
      
      if (processedEmails.length > 0) {
        // Agregar emails procesados a la lista existente, evitando duplicados
        const combinedEmails = [...new Set([...this.emailList, ...processedEmails])];
        this.emailList = combinedEmails;
        
        // Limpiar el input después de procesar
        this.emailInput = '';
        target.value = '';
      }
    }, 10);
  }

  /**
   * Maneja el evento de tecla presionada en el input
   * Permite agregar emails con Enter o al pegar contenido
   */
  onEmailInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault();
      const target = event.target as HTMLInputElement;
      this.onEmailInputChange({ target });
    }
  }

  /**
   * Remueve un email específico de la lista
   * @param emailToRemove Email a remover de la lista
   */
  removeEmail(emailToRemove: string): void {
    this.emailList = this.emailList.filter(email => email !== emailToRemove);
  }

  /**
   * Emite el evento con la lista de emails procesados
   * @param emails Array de emails a emitir
   */
  addStudentsEvent(emails: string[]): void {
    // Procesar cualquier email restante en el input antes de enviar
    if (this.emailInput.trim()) {
      const remainingEmails = this.processEmailInput(this.emailInput);
      emails = [...new Set([...emails, ...remainingEmails])];
    }
    
    // Limpiar la lista y el input
    this.emailList = [];
    this.emailInput = '';
    
    // Emitir emails válidos y únicos
    const validEmails = emails
      .map(email => email.trim())
      .filter(email => email.length > 0)
      .filter(email => this.isValidEmail(email));
    
    this.onAddStudents.emit([...new Set(validEmails)]);
  }
}
