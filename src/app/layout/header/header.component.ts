import { Component } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { IUser } from '../../models/models';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.css'
})
export class HeaderComponent {

  loggedUser: IUser | undefined = undefined;

  notificationPanelOpen = false;

  constructor(private authService: AuthService, private router: Router) { }

  ngOnInit(): void {
    this.authService.loggedUser.subscribe(
      loggedUser => {
        this.loggedUser = loggedUser
      }
    );
    this.authService.refreshUserData();
  }

  logoutButton() {
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }

  toggleNotificationPanel() {
    this.notificationPanelOpen = !this.notificationPanelOpen;
  }

  clearNotifications() {
    this.authService.clearNotifications();
  }

  routerLinkSameUrl(path: string | undefined) {
    if (!path) return;
    
    this.router.navigateByUrl('/', { skipLocationChange: true }).then(() => {
      this.router.navigateByUrl(path);
    });
  }


}
