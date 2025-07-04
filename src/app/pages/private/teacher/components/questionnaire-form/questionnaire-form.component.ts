import { Component, Input } from '@angular/core';
import { IQuestionnaire, IUser } from '../../../../../models/models';
import { AbstractControl, FormControl, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { FormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { RadioButtonModule } from 'primeng/radiobutton';
import { DividerModule } from 'primeng/divider';

import { QuestionnairesService } from '../../../../../services/questionnaires.service';
import { AuthService } from '../../../../../services/auth.service';
import { Route, Router } from '@angular/router';

@Component({
  selector: 'app-questionnaire-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RadioButtonModule, DividerModule],
  templateUrl: './questionnaire-form.component.html',
  styleUrl: './questionnaire-form.component.css'
})
export class QuestionnaireFormComponent {

  @Input('questionnaire_id') questionnaireId!: string;

  questionnaire: IQuestionnaire | undefined;

  questionnaireFormGroup: FormGroup = new FormGroup({});
  submitted = false;

  loggedUser: IUser | undefined;

  constructor(private questionnaireService: QuestionnairesService, private authService: AuthService, private router: Router) { }

  ngOnInit() {

    this.loggedUser = this.authService.getUser();

    this.questionnaireService.getQuestionnaireById(this.questionnaireId).subscribe({
      next: (data: any) => {

        this.questionnaire = data;

        this.questionnaire?.questions.forEach((question, index) => {

          switch (question.type) {
            case 'MultipleChoice':
              this.questionnaireFormGroup.addControl(index.toString(), new FormControl('', Validators.required));
              break;
            case 'OpenText':
              this.questionnaireFormGroup.addControl(index.toString(), new FormControl('', Validators.required));
              break;
            case 'Rating':
              this.questionnaireFormGroup.addControl(index.toString(), new FormControl('', Validators.required));
              break;
            case 'Distribution':
              const dfg = new FormGroup({}, { validators: [this.sumaExactaValidator(10), this.maximoExcedidoValidator(10)] });
              for (let i = 0; i < (question?.options?.length ?? 0); i++) {
                dfg.addControl(i.toString(), new FormControl(0, Validators.required));
              }
              this.questionnaireFormGroup.addControl(index.toString(), dfg);
              break;
          }
        })

        console.log(this.questionnaireFormGroup)

      }
    })
  }

  onSubmitQuiestionnaire() {

    this.submitted = true;

    if (this.questionnaireFormGroup.invalid) {
      console.log('Form is invalid');
      console.log('Errors:', this.questionnaireFormGroup.errors);
      
      // Mostrar errores específicos para Debug
      Object.keys(this.questionnaireFormGroup.controls).forEach(key => {
        const control = this.questionnaireFormGroup.get(key);
        if (control && control.errors) {
          console.log(`Question ${key} errors:`, control.errors);
        }
      });
      
      return;
    }

    // console.log(this.questionnaireFormGroup.value);

    this.questionnaireService.submitQuestionnaire(this.questionnaireId, this.questionnaireFormGroup.value).subscribe((data: any) => {
      console.log('Questionnaire submitted', data);
      this.loggedUser!['askedQuestionnaires'].push(data.data);
      console.log('loggedUser', this.loggedUser);

    });

    this.router.navigateByUrl('/dashboard');

  }

  /**
   * Obtiene el total de puntos usados en una pregunta de distribución
   */
  getTotalPoints(questionIndex: number): number {
    const questionGroup = this.questionnaireFormGroup.get(questionIndex.toString());
    if (!questionGroup) return 0;
    
    const values = Object.values(questionGroup.value || {});
    return values.reduce((acc: number, num: any) => acc + (typeof num === 'number' ? num : 0), 0);
  }



  /**
   * Validador que verifica que la suma sea exactamente el valor esperado
   */
  sumaExactaValidator(exactSum: number): ValidatorFn {
    return (formGroup: AbstractControl): ValidationErrors | null => {
      const sum = Object.values(formGroup.value).reduce((acc: number, num) => acc + (typeof num === 'number' ? num : 0), 0);
      return sum !== exactSum ? { sumaExacta: { actual: sum, expected: exactSum } } : null;
    };
  }

  /**
   * Validador que verifica que la suma no exceda el máximo permitido
   */
  maximoExcedidoValidator(maxSum: number): ValidatorFn {
    return (formGroup: AbstractControl): ValidationErrors | null => {
      const sum = Object.values(formGroup.value).reduce((acc: number, num) => acc + (typeof num === 'number' ? num : 0), 0);
      return sum > maxSum ? { maximoExcedido: { actual: sum, max: maxSum } } : null;
    };
  }

  /**
   * Obtiene el valor actual de una opción específica
   */
  getOptionValue(questionIndex: number, optionIndex: number): number {
    const questionGroup = this.questionnaireFormGroup.get(questionIndex.toString());
    if (!questionGroup) return 0;
    
    const control = questionGroup.get(optionIndex.toString());
    return control ? (control.value || 0) : 0;
  }

  /**
   * Calcula cuántos puntos quedan disponibles (excluyendo la opción actual)
   */
  getRemainingPoints(questionIndex: number, excludeOptionIndex: number): number {
    const questionGroup = this.questionnaireFormGroup.get(questionIndex.toString());
    if (!questionGroup) return 10;

    const values = questionGroup.value || {};
    let totalUsed = 0;
    
    Object.keys(values).forEach(key => {
      if (parseInt(key) !== excludeOptionIndex) {
        totalUsed += (values[key] || 0);
      }
    });

    return Math.max(0, 10 - totalUsed);
  }

  /**
   * Verifica si se puede incrementar el valor de una opción
   */
  canIncrease(questionIndex: number, optionIndex: number): boolean {
    const currentValue = this.getOptionValue(questionIndex, optionIndex);
    const remainingPoints = this.getRemainingPoints(questionIndex, optionIndex);
    return remainingPoints > 0 && currentValue < 10;
  }

  /**
   * Incrementa el valor de una opción
   */
  increaseValue(questionIndex: number, optionIndex: number): void {
    if (!this.canIncrease(questionIndex, optionIndex)) return;

    const questionGroup = this.questionnaireFormGroup.get(questionIndex.toString());
    if (!questionGroup) return;

    const control = questionGroup.get(optionIndex.toString());
    if (!control) return;

    const currentValue = control.value || 0;
    control.setValue(currentValue + 1);
    questionGroup.updateValueAndValidity();
  }

  /**
   * Disminuye el valor de una opción
   */
  decreaseValue(questionIndex: number, optionIndex: number): void {
    const currentValue = this.getOptionValue(questionIndex, optionIndex);
    if (currentValue <= 0) return;

    const questionGroup = this.questionnaireFormGroup.get(questionIndex.toString());
    if (!questionGroup) return;

    const control = questionGroup.get(optionIndex.toString());
    if (!control) return;

    control.setValue(currentValue - 1);
    questionGroup.updateValueAndValidity();
  }

  /**
   * Maneja cambios en el input cuando el usuario escribe directamente
   */
  onInputChange(questionIndex: number, optionIndex: number, event: any): void {
    const inputValue = parseInt(event.target.value) || 0;
    const questionGroup = this.questionnaireFormGroup.get(questionIndex.toString());
    if (!questionGroup) return;

    const control = questionGroup.get(optionIndex.toString());
    if (!control) return;

    // Evitar números negativos
    if (inputValue < 0) {
      control.setValue(0);
      event.target.value = '0';
      questionGroup.updateValueAndValidity();
      return;
    }

    // Calcular el máximo permitido para esta opción
    const remainingPoints = this.getRemainingPoints(questionIndex, optionIndex);
    const maxAllowed = remainingPoints;

    // Si excede el máximo, limitarlo
    if (inputValue > maxAllowed) {
      control.setValue(maxAllowed);
      event.target.value = maxAllowed.toString();
    } else {
      control.setValue(inputValue);
    }

    questionGroup.updateValueAndValidity();
  }

  /**
   * Valida el input al perder el foco
   */
  validateInput(questionIndex: number, optionIndex: number): void {
    const questionGroup = this.questionnaireFormGroup.get(questionIndex.toString());
    if (!questionGroup) return;

    const control = questionGroup.get(optionIndex.toString());
    if (!control) return;

    // Asegurar que el valor esté dentro de los límites
    const currentValue = control.value || 0;
    const remainingPoints = this.getRemainingPoints(questionIndex, optionIndex);
    
    if (currentValue < 0) {
      control.setValue(0);
    } else if (currentValue > remainingPoints) {
      control.setValue(remainingPoints);
    }

    questionGroup.updateValueAndValidity();
  }

  /**
   * Verifica si una opción debe estar deshabilitada
   */
  isOptionDisabled(questionIndex: number, optionIndex: number): boolean {
    // No deshabilitar inputs, permitir entrada manual
    return false;
  }

}