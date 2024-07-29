type Trait = string;
type Member = { id: string, traits: Trait[] };
type Constraint = {
  type: string;
  name: string;
  number_members?: number;
  team_size?: number;
  min?: number;
  max?: number;
  members?: string[];
};

export default class BelbinAlgorithmData {
  number_members: number;
  members: Member[];
  agg_func: string;
  constraints: Constraint[];
  traits: Trait[];
  problem_type: string;

  constructor() {
    this.number_members = 0;
    this.members = [];
    this.agg_func = "sum";
    this.constraints = [];
    this.traits = ["TW", "CW", "CH", "ME", "CF", "SH", "PL", "RI"];
    this.problem_type = "TraitTeamFormation";
  }

  addMember(member: Member): void {
    this.members.push(member);
    this.number_members = this.members.length;
  }

  addConstraint(type: string, name: string, details?: Partial<Constraint>): void {
    const constraint: Constraint = { type, name, ...details };
    this.constraints.push(constraint);
  }

  toDTO(): {} {
    return {
      number_members: this.number_members,
      members: this.members,
      agg_func: this.agg_func,
      constraints: this.constraints,
      traits: this.traits,
      problem_type: this.problem_type,
    }
  }

}