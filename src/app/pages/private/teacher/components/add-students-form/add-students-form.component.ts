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
   * Procesa automáticamente cuando hay emails válidos separados
   */
  onEmailInputChange(event: any): void {
    const inputValue = event.target.value;
    this.emailInput = inputValue;
    
    // Procesar automáticamente cuando hay espacios o comas y emails válidos
    if (inputValue.includes(' ') || inputValue.includes(',')) {
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
   * Maneja el evento de pegado específicamente
   * Procesa automáticamente cuando se pega contenido
   */
  onEmailInputPaste(event: ClipboardEvent): void {
    setTimeout(() => {
      const target = event.target as HTMLInputElement;
      const inputValue = target.value;
      
      if (inputValue.trim()) {
        const processedEmails = this.processEmailInput(inputValue);
        
        if (processedEmails.length > 0) {
          // Agregar emails procesados a la lista existente, evitando duplicados
          const combinedEmails = [...new Set([...this.emailList, ...processedEmails])];
          this.emailList = combinedEmails;
          
          // Limpiar el input después de procesar
          this.emailInput = '';
          target.value = '';
        }
      }
    }, 50); // Tiempo ligeramente mayor para asegurar que el contenido se pegue completamente
  }

  /**
   * Maneja el evento de tecla presionada en el input
   * Permite agregar emails con Enter de forma intuitiva
   */
  onEmailInputKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      const target = event.target as HTMLInputElement;
      const inputValue = target.value.trim();
      
      if (inputValue) {
        // Intentar procesar todo el contenido del input
        const processedEmails = this.processEmailInput(inputValue);
        
        if (processedEmails.length > 0) {
          // Agregar todos los emails válidos encontrados
          const combinedEmails = [...new Set([...this.emailList, ...processedEmails])];
          this.emailList = combinedEmails;
          this.emailInput = '';
          target.value = '';
        } else if (this.isValidEmail(inputValue)) {
          // Si no se procesó pero es un email válido individual, agregarlo
          const newEmails = [...new Set([...this.emailList, inputValue])];
          this.emailList = newEmails;
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
