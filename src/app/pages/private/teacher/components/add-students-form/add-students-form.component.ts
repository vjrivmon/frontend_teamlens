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
   * Valida si un string es un email válido y completo
   * @param email String a validar
   * @returns boolean indicando si es un email válido
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Maneja la entrada de texto en el campo de emails
   * Solo procesa cuando se detectan emails completos válidos
   */
  onEmailInputChange(event: any): void {
    const inputValue = event.target.value;
    this.emailInput = inputValue;
    
    // Solo procesar si hay espacios o comas (indicando múltiples emails)
    // y el último caracter no es parte de un email en construcción
    if (this.shouldProcessInput(inputValue)) {
      const processedEmails = this.processEmailInput(inputValue);
      
      if (processedEmails.length > 0) {
        // Agregar emails procesados a la lista existente, evitando duplicados
        const combinedEmails = [...new Set([...this.emailList, ...processedEmails])];
        this.emailList = combinedEmails;
        
        // Limpiar el input después de procesar
        this.emailInput = '';
        event.target.value = '';
      }
    }
  }

  /**
   * Determina si el input debe ser procesado automáticamente
   * @param input Texto de entrada
   * @returns boolean indicando si debe procesarse
   */
  private shouldProcessInput(input: string): boolean {
    if (!input.trim()) return false;
    
    // Procesar solo si hay múltiples emails válidos separados
    const emails = input.trim().split(/[,\s]+/).filter(email => email.length > 0);
    
    // Solo procesar si hay más de un elemento Y al menos uno es un email válido completo
    if (emails.length <= 1) return false;
    
    // Verificar que al menos el primer email (o penúltimo si está escribiendo) sea válido
    const emailsToCheck = emails.slice(0, -1); // Excluir el último que puede estar en construcción
    return emailsToCheck.some(email => this.isValidEmail(email));
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
   * Permite agregar emails con Enter cuando hay un email válido
   */
  onEmailInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      const target = event.target as HTMLInputElement;
      const inputValue = target.value.trim();
      
      if (this.isValidEmail(inputValue)) {
        // Agregar email individual válido
        const newEmails = [...new Set([...this.emailList, inputValue])];
        this.emailList = newEmails;
        this.emailInput = '';
        target.value = '';
      } else if (inputValue.includes(' ') || inputValue.includes(',')) {
        // Procesar múltiples emails
        const processedEmails = this.processEmailInput(inputValue);
        if (processedEmails.length > 0) {
          const combinedEmails = [...new Set([...this.emailList, ...processedEmails])];
          this.emailList = combinedEmails;
          this.emailInput = '';
          target.value = '';
        }
      }
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
