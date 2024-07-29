import { Directive, OnInit, ElementRef } from "@angular/core";
import { AuthService } from "../services/auth.service";

@Directive({
  selector: "[studentOnly]",
  standalone: true
})
export class StudentOnlyDirective implements OnInit {

  constructor(private elementRef: ElementRef, private authService: AuthService) { }

  ngOnInit() {
    this.elementRef.nativeElement.style.display = "none";
    this.checkAccess();
  }
  checkAccess() {
    const user = this.authService.getUser();
    // console.log('StudentOnlyDirective: User', user);
    this.elementRef.nativeElement.style.display = user?.role == "student" ? "block" : "none";
  }
}