import { Directive, OnInit, ElementRef } from "@angular/core";
import { AuthService } from "../services/auth.service";

@Directive({
  selector: "[teacherOnly]",
  standalone: true
})
export class TeacherOnlyDirective implements OnInit {

  constructor(private elementRef: ElementRef, private authService: AuthService) { }

  ngOnInit() {
    this.elementRef.nativeElement.style.display = "none";
    this.checkAccess();
  }
  checkAccess() {
    const user = this.authService.getUser();
    // console.log('TeacherOnlyDirective: User', user);
    this.elementRef.nativeElement.style.display = user?.role == "teacher" ? "block" : "none";
  }
}