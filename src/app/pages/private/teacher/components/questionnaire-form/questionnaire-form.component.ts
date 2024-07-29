import { Component, Input } from '@angular/core';
import { IQuestionnaire, IUser } from '../../../../../models/models';
import { AbstractControl, FormControl, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { FormGroup } from '@angular/forms';

import { RadioButtonModule } from 'primeng/radiobutton';
import { DividerModule } from 'primeng/divider';
import { InputNumberModule } from 'primeng/inputnumber';

import { QuestionnairesService } from '../../../../../services/questionnaires.service';
import { AuthService } from '../../../../../services/auth.service';
import { Route, Router } from '@angular/router';

@Component({
  selector: 'app-questionnaire-form',
  standalone: true,
  imports: [ReactiveFormsModule, RadioButtonModule, DividerModule, InputNumberModule],
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
              const dfg = new FormGroup({}, { validators: this.sumaExactaValidator(10) });
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

  sumaExactaValidator(exactSum: number): ValidatorFn {
    return (formGroup: AbstractControl): ValidationErrors | null => {
      const sum = Object.values(formGroup.value).reduce((acc: number, num) => acc + (typeof num === 'number' ? num : 0), 0);
      return sum !== exactSum ? { sumaExacta: { actual: sum, expected: exactSum } } : null;
    };
  }

  pickHex(color1: any, color2: any, weight: any) {
    var w2 = weight / 10;
    var w1 = 1 - w2;
    var rgb = [Math.round(color1[0] * w1 + color2[0] * w2),
    Math.round(color1[1] * w1 + color2[1] * w2),
    Math.round(color1[2] * w1 + color2[2] * w2)];
    return 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
  }

}