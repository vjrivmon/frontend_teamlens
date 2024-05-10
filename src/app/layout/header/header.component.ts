import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common'; 
import { Router, RouterModule } from '@angular/router';
import { TAuthUser } from '../../models/models';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {

  loggedUser: TAuthUser | undefined = undefined;

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit(): void {
    this.authService.loggedUser.subscribe(
      loggedUser => {
        console.log('isLoggedIn', loggedUser);
        this.loggedUser = loggedUser
      }
    );
  }

  logoutButton() {  
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }
  
}
