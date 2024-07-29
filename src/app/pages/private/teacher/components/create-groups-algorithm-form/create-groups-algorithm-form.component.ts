import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

import { FormBuilder, Validators } from '@angular/forms';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { StepperModule } from 'primeng/stepper';
import { DropdownModule } from 'primeng/dropdown';
import { TableModule } from 'primeng/table';

import { IUser, IQuestionnaire } from '../../../../../models/models';
import { ActivitiesService } from '../../../../../services/activities.service';

import BelbinAlgorithmData from '../../../../../models/algorithm-data';

interface IRestrictions {
  mustBeTogether: IUser[][],
  mustNotBeTogether: IUser[][],
  mustBeAGroup: IUser[][]
}

@Component({
  selector: 'app-create-groups-algorithm-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, ButtonModule, InputTextModule, InputNumberModule, InputTextareaModule, StepperModule, DropdownModule, TableModule],
  templateUrl: './create-groups-algorithm-form.component.html',
  styleUrl: './create-groups-algorithm-form.component.css'
})
export class CreateGroupsAlgorithmFormComponent {


  //@Output() onCreated = new EventEmitter<bool>();

  @Input('activity') activityId: string = "";
  @Input('students') students: IUser[] = [];

  @Output() onRequestSent = new EventEmitter<boolean>();

  questionnaires = [{
    id: 1,
    title: 'BELBIN'
  },
    // {
    //   id: 2,
    //   title: 'MBTI'
    // }
  ]

  teamBuilderForm = this.formBuilder.group({
    algorithm: [this.questionnaires[0] || {} as IQuestionnaire, [Validators.required]],
    minGroups: [1, [Validators.required, Validators.min(1)]],
    maxGroups: [1, [Validators.required, Validators.min(1)]],
    groupSize: [1, [Validators.required, Validators.min(1)]],
  })

  selectedStudents: IUser[] = [];
  
  searchValue: string | undefined;
  searchValueRestricctions: string | undefined;
  selectedRestrictionStudents: IUser[] = [];
  
  restrictions: IRestrictions = {
    mustBeTogether: [],
    mustNotBeTogether: [],
    mustBeAGroup: []
  };

  active: number = 0;

  constructor(private formBuilder: FormBuilder, private activityService: ActivitiesService) { }

  createRestriction(restrictionType: keyof IRestrictions) {

    // if (this.selectedRestrictionStudents.length < 2) {
    //   alert("You must select at least 2 students to create a restriction")
    //   return;
    // }

    // Check if the restriction is valid and makes sense with another ones
    const conflict = this.hasConflict(this.restrictions, this.selectedRestrictionStudents, restrictionType as 'mustBeTogether' | 'mustNotBeTogether') //todo: enum

    if (conflict) {
      alert("This restriction conflicts with another one")
      return;
    }

    this.restrictions[restrictionType].push(this.selectedRestrictionStudents);
    this.selectedRestrictionStudents = [];
  }

  removeRestriction(restrictionType: keyof IRestrictions, restrictionIndex: number) {
    this.restrictions[restrictionType].splice(restrictionIndex, 1);
  }

  onCreateGroups() {

    const { minGroups, maxGroups, groupSize } = this.teamBuilderForm.value;

    const algorithmData = new BelbinAlgorithmData();    
    
    this.students.forEach(user => {
      algorithmData.addMember({ id: user._id, traits: user.traits ?? [] });
    });

    algorithmData.addConstraint("AllAssigned", "", { number_members: 23 });
    algorithmData.addConstraint("NonOverlapping", "");
    
    // algorithmData.addConstraint("SizeCardinality", "", { team_size: , min: 5, max: 5 });
    algorithmData.addConstraint("SizeCardinality", "", { name: "", team_size: groupSize ?? 1, min: minGroups ?? 1, max: maxGroups ?? 99 });

    this.restrictions.mustBeTogether.forEach(restriction => {
      algorithmData.addConstraint("SameTeam", "", { members: restriction.map(u => u._id) });
    });

    this.restrictions.mustNotBeTogether.forEach(restriction => {
      algorithmData.addConstraint("DifferentTeam", "", { members: restriction.map(u => u._id) });
    });

    algorithmData.number_members = groupSize ?? 1;

    this.activityService.createGroupsAlgorithm(this.activityId, algorithmData.toDTO()).subscribe((res) => {
      // Close the dialog
      console.log(res)
      this.onRequestSent.emit(true);
    });    

  }

  hasConflict(restrictions: IRestrictions, newUsers: IUser[], type: 'mustBeTogether' | 'mustNotBeTogether'): boolean {
    const { mustBeTogether, mustNotBeTogether } = restrictions;

    if (type === 'mustBeTogether') {
      // Check if any pair in newUsers exists in mustNotBeTogether
      for (const usersSet of mustNotBeTogether) {
        for (let i = 0; i < newUsers.length; i++) {
          for (let j = i + 1; j < newUsers.length; j++) {
            const user1 = newUsers[i];
            const user2 = newUsers[j];
            if (usersSet.some(u => u._id === user1._id) && usersSet.some(u => u._id === user2._id)) {
              return true;
            }
          }
        }
      }
    } else if (type === 'mustNotBeTogether') {
      // Check if any pair in newUsers exists in mustBeTogether
      for (const usersSet of mustBeTogether) {
        for (let i = 0; i < newUsers.length; i++) {
          for (let j = i + 1; j < newUsers.length; j++) {
            const user1 = newUsers[i];
            const user2 = newUsers[j];
            if (usersSet.some(u => u._id === user1._id) && usersSet.some(u => u._id === user2._id)) {
              return true;
            }
          }
        }
      }
    }

    return false;
  }

}

