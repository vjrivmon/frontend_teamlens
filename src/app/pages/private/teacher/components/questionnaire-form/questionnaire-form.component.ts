import { Component, Input } from '@angular/core';
import { IQuestionnaire, IUser } from '../../../../../models/models';
import { AbstractControl, FormControl, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { FormGroup } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { RadioButtonModule } from 'primeng/radiobutton';
import { DividerModule } from 'primeng/divider';
import { InputTextModule } from 'primeng/inputtext';

import { QuestionnairesService } from '../../../../../services/questionnaires.service';
import { AuthService } from '../../../../../services/auth.service';
import { Route, Router, ActivatedRoute } from '@angular/router';
import { BelbinResultComponent } from '../../../../../components/belbin-result/belbin-result.component';

@Component({
  selector: 'app-questionnaire-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RadioButtonModule, DividerModule, InputTextModule, BelbinResultComponent],
  templateUrl: './questionnaire-form.component.html',
  styleUrl: './questionnaire-form.component.css'
})
export class QuestionnaireFormComponent {

  @Input('questionnaire_id') questionnaireId!: string;

  questionnaire: IQuestionnaire | undefined;
  questionnaireFormGroup: FormGroup = new FormGroup({});
  emailFormControl: FormControl = new FormControl('', [Validators.required, Validators.email]);
  submitted = false;

  // Estado del usuario
  loggedUser: IUser | undefined;
  isAnonymousUser: boolean = false;
  studentEmail: string = '';

  // Modal de resultados de Belbin
  showBelbinModal: boolean = false;
  belbinResult: string = '';
  belbinAllRoles: any[] = [];
  belbinUserEmail: string = '';

  constructor(
    private questionnaireService: QuestionnairesService, 
    private authService: AuthService, 
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit() {
    console.log('🎯 [QuestionnaireForm] Inicializando formulario de cuestionario');

    // Detectar tipo de usuario
    this.loggedUser = this.authService.getUser();
    this.isAnonymousUser = !this.loggedUser;

    console.log(`👤 [QuestionnaireForm] Tipo de usuario: ${this.isAnonymousUser ? 'Anónimo' : 'Autenticado'}`);

    // Extraer email de query parameters si viene de enlace de correo
    this.route.queryParams.subscribe(params => {
      if (params['email']) {
        this.studentEmail = params['email'];
        this.emailFormControl.setValue(this.studentEmail);
        console.log(`📧 [QuestionnaireForm] Email detectado en URL: ${this.studentEmail}`);
      }
    });

    // Obtener ID del cuestionario desde la ruta
    this.route.params.subscribe(params => {
      this.questionnaireId = params['questionnaire_id'];
      console.log(`📋 [QuestionnaireForm] ID del cuestionario: ${this.questionnaireId}`);
      this.loadQuestionnaire();
    });
  }

  /**
   * Carga los datos del cuestionario y construye el formulario
   */
  private loadQuestionnaire(): void {
    this.questionnaireService.getQuestionnaireById(this.questionnaireId).subscribe({
      next: (data: any) => {
        console.log('📋 [QuestionnaireForm] Cuestionario cargado:', data);
        this.questionnaire = data;
        this.buildQuestionnaireForm();
      },
      error: (error) => {
        console.error('❌ [QuestionnaireForm] Error cargando cuestionario:', error);
      }
    });
  }

  /**
   * Construye el formulario dinámico basado en las preguntas
   */
  private buildQuestionnaireForm(): void {
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
    });

    console.log('📝 [QuestionnaireForm] Formulario construido:', this.questionnaireFormGroup);
  }

  onSubmitQuiestionnaire() {
    console.log('🚀 [QuestionnaireForm] Iniciando envío del cuestionario');
    this.submitted = true;

    // Validar formulario principal
    if (this.questionnaireFormGroup.invalid) {
      console.log('❌ [QuestionnaireForm] Formulario inválido');
      console.log('Errores:', this.questionnaireFormGroup.errors);
      
      // Mostrar errores específicos para Debug
      Object.keys(this.questionnaireFormGroup.controls).forEach(key => {
        const control = this.questionnaireFormGroup.get(key);
        if (control && control.errors) {
          console.log(`Question ${key} errors:`, control.errors);
        }
      });
      
      return;
    }

    // Para usuarios anónimos, validar email
    if (this.isAnonymousUser && this.emailFormControl.invalid) {
      console.log('❌ [QuestionnaireForm] Email requerido para usuarios anónimos');
      return;
    }

    const formData = this.questionnaireFormGroup.value;
    console.log('📝 [QuestionnaireForm] Datos del formulario:', formData);

    if (this.isAnonymousUser) {
      // Submit anónimo - necesitaré crear este método
      this.submitAnonymousQuestionnaire(formData);
    } else {
      // Submit para usuario autenticado
      this.submitAuthenticatedQuestionnaire(formData);
    }
  }

  /**
   * Envía cuestionario para usuario autenticado
   */
  private submitAuthenticatedQuestionnaire(formData: any): void {
    console.log('👤 [QuestionnaireForm] Enviando cuestionario para usuario autenticado');
    
    this.questionnaireService.submitQuestionnaire(this.questionnaireId, formData).subscribe({
      next: (data: any) => {
        console.log('✅ [QuestionnaireForm] Cuestionario enviado exitosamente:', data);
        console.log('📊 [QuestionnaireForm] Datos específicos recibidos:', data.data);
        console.log('🔍 [QuestionnaireForm] ¿Incluye allRoles?', !!data.data?.allRoles);
        console.log('🔍 [QuestionnaireForm] ¿Incluye result?', !!data.data?.result);
        
        // Actualizar datos del usuario si están disponibles
        if (this.loggedUser && data.data) {
          // Asegurar que askedQuestionnaires existe
          if (!this.loggedUser['askedQuestionnaires']) {
            this.loggedUser['askedQuestionnaires'] = [];
          }
          this.loggedUser['askedQuestionnaires'].push(data.data);
        }
        
        // DEBUGGING: Mostrar todos los datos recibidos
        console.log('🔍 [DEBUG] Objeto data completo:', JSON.stringify(data, null, 2));
        console.log('🔍 [DEBUG] Tipo de data.data:', typeof data.data);
        console.log('🔍 [DEBUG] data.data.result:', data.data?.result);
        console.log('🔍 [DEBUG] data.data.allRoles:', data.data?.allRoles);
        console.log('🔍 [DEBUG] Array.isArray(data.data.allRoles):', Array.isArray(data.data?.allRoles));
        
        // Mostrar modal de resultados de Belbin si están disponibles
        if (data.data?.result && data.data?.allRoles && Array.isArray(data.data.allRoles)) {
          console.log('🎯 [QuestionnaireForm] ✅ CONDICIONES CUMPLIDAS - Mostrando resultados detallados de Belbin');
          this.belbinResult = data.data.result;
          this.belbinAllRoles = data.data.allRoles;
          this.belbinUserEmail = this.loggedUser?.email || '';
          this.showBelbinModal = true;
          
          // DEBUGGING: Verificar que el modal se ha activado
          console.log('🔍 [DEBUG] showBelbinModal establecido a:', this.showBelbinModal);
          console.log('🔍 [DEBUG] belbinResult:', this.belbinResult);
          console.log('🔍 [DEBUG] belbinAllRoles length:', this.belbinAllRoles?.length);
        } else {
          console.log('⚠️ [QuestionnaireForm] ❌ CONDICIONES NO CUMPLIDAS - No hay datos válidos de Belbin');
          console.log('🔍 [DEBUG] Razones:');
          console.log('  - data.data?.result:', !!data.data?.result);
          console.log('  - data.data?.allRoles:', !!data.data?.allRoles);
          console.log('  - Array.isArray(allRoles):', Array.isArray(data.data?.allRoles));
          
          // TEMPORAL: Forzar modal para testing si hay al menos result
          if (data.data?.result) {
            console.log('🧪 [TESTING] Forzando modal con datos parciales para debugging');
            this.belbinResult = data.data.result;
            this.belbinAllRoles = data.data?.allRoles || [];
            this.belbinUserEmail = this.loggedUser?.email || '';
            this.showBelbinModal = true;
          } else {
            // Redirigir al dashboard para cuestionarios que no sean Belbin
            this.router.navigateByUrl('/dashboard');
          }
        }
      },
      error: (error) => {
        console.error('❌ [QuestionnaireForm] Error enviando cuestionario:', error);
        alert('Error al enviar el cuestionario. Por favor, inténtalo de nuevo.');
      }
    });
  }

  /**
   * Envía cuestionario para usuario anónimo
   */
  private submitAnonymousQuestionnaire(formData: any): void {
    console.log('👥 [QuestionnaireForm] Enviando cuestionario para usuario anónimo');
    
    const studentEmail = this.emailFormControl.value || this.studentEmail;
    
    if (!studentEmail) {
      console.error('❌ [QuestionnaireForm] Email no proporcionado para submit anónimo');
      alert('Por favor, proporciona tu email para continuar.');
      return;
    }

    console.log('📧 [QuestionnaireForm] Email del estudiante:', studentEmail);

    // Usar el método específico para anónimos
    this.questionnaireService.submitAnonymousQuestionnaire(this.questionnaireId, formData, studentEmail).subscribe({
      next: (data: any) => {
        console.log('✅ [QuestionnaireForm] Cuestionario anónimo enviado exitosamente:', data);
        console.log('📊 [QuestionnaireForm] Datos específicos recibidos (anónimo):', data.data);
        console.log('🔍 [QuestionnaireForm] ¿Incluye allRoles? (anónimo)', !!data.data?.allRoles);
        console.log('🔍 [QuestionnaireForm] ¿Incluye result? (anónimo)', !!data.data?.result);
        
        // Mostrar modal de resultados de Belbin si están disponibles
        if (data.data?.result && data.data?.allRoles) {
          console.log('🎯 [QuestionnaireForm] Mostrando resultados detallados de Belbin');
          this.belbinResult = data.data.result;
          this.belbinAllRoles = data.data.allRoles;
          this.belbinUserEmail = studentEmail;
          this.showBelbinModal = true;
        } else {
          // Fallback para cuestionarios que no sean Belbin
          let message = '¡Gracias por completar el cuestionario! Tus respuestas han sido enviadas exitosamente.';
          
          if (data.data?.result) {
            message += `\n\nTu resultado es: ${data.data.result}`;
          }
          
          if (data.data?.isNewUser) {
            message += '\n\nSe ha creado automáticamente tu perfil en el sistema.';
          }
          
          alert(message);
          this.router.navigateByUrl('/home');
        }
      },
      error: (error) => {
        console.error('❌ [QuestionnaireForm] Error enviando cuestionario anónimo:', error);
        
        let errorMessage = 'Error al enviar el cuestionario.';
        
        if (error.status === 400) {
          errorMessage += ' Por favor, verifica que tu email sea válido.';
        } else if (error.status === 404) {
          errorMessage += ' El cuestionario no está disponible.';
        } else {
          errorMessage += ' Por favor, inténtalo de nuevo más tarde.';
        }
        
        alert(errorMessage);
      }
    });
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

  /**
   * Maneja el cierre del modal de resultados de Belbin
   */
  onBelbinModalClose(): void {
    console.log('🔒 [QuestionnaireForm] Cerrando modal de resultados de Belbin');
    this.showBelbinModal = false;
    
    // Limpiar datos del modal
    this.belbinResult = '';
    this.belbinAllRoles = [];
    this.belbinUserEmail = '';
    
    // CORRECCIÓN: Siempre redirigir al dashboard correcto
    // (tanto para usuarios anónimos como autenticados, ya que están completando 
    // un cuestionario de una actividad de profesor)
    console.log('🎯 [QuestionnaireForm] Redirigiendo al dashboard...');
    this.router.navigateByUrl('/dashboard');
  }

}