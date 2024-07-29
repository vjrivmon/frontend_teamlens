import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { IUser } from '../models/models';
import { HttpClient } from '@angular/common/http';


@Injectable()
export class AuthService {

  http = inject(HttpClient);

  private isLoggedInSubject = new BehaviorSubject<boolean>(this.hasToken());
  isLoggedIn: Observable<boolean> = this.isLoggedInSubject.asObservable();

  loggedUserSubject = new BehaviorSubject<IUser | undefined>(this.getUser());
  loggedUser: Observable<IUser | undefined> = this.loggedUserSubject.asObservable();

  login(email: string, password: string, { done, err }: any): void {

    //connect to api and get token

    let user: IUser | undefined;
    this.http.post('http://localhost:3000/auth/login', { email, password }, { observe: 'response', withCredentials: true }).subscribe(({

      next: (data: any) => {

        user = data.body as IUser;

        if (!user) {
          alert('User not found');
          return;
        }

        sessionStorage.setItem('user', JSON.stringify(user));
        sessionStorage.setItem('token', 'JWT');
        this.isLoggedInSubject.next(true);
        this.loggedUserSubject.next(user);

        console.log('isLoggedIn', this.loggedUserSubject.value);

        done();

      },
      error: (error) => {
        console.log(error)
        err(error)
      }

    }))


  }

  register(email: string, name: string, password: string, role: string, { done, err }: any): void {

    this.http.post('http://localhost:3000/auth/register', { email, name, password }, { observe: 'response', withCredentials: true }).subscribe(({

      next: (data: any) => {
        done();
      },
      error: (error) => {
        console.log(error)
        err(error)
      }

    }))


  }

  registerStudent(email: string, name: string, password: string, role: string, { done, err }: any): void {

    this.http.post('http://localhost:3000/auth/register-student', { email, name, password }, { observe: 'response', withCredentials: true }).subscribe(({

      next: (data: any) => {
        done();
      },
      error: (error) => {
        console.log(error)
        err(error)
      }

    }))


  }

  logout(): void {
    sessionStorage.clear();
    this.isLoggedInSubject.next(false);
    this.loggedUserSubject.next(undefined);
  }

  getUser(): IUser | undefined {
    const user = sessionStorage.getItem('user');
    return user ? JSON.parse(user) : undefined;
  }

  refreshUserData(): void {
    this.http.get('http://localhost:3000/users/' + this.getUser()?._id).subscribe((data) =>{

      console.log('refreshUserData', data);
      sessionStorage.setItem('user', JSON.stringify(data));
      this.loggedUserSubject.next(data as IUser);

    })
  }

  private hasToken(): boolean {
    return !!sessionStorage.getItem('token');
  }

  forgotPassword(email: string, { done, err }: any): void {
    console.log(email)
    this.http.post('http://localhost:3000/auth/forgot-password', { email }).subscribe(({

      next: (data: any) => {
        done();
      },
      error: (error) => {
        console.log(error, err)
        err(error)
      }

    }))
  }

  resetPassword(token: string, password: string, { done, err }: any): void {
    console.log(token)
    this.http.post('http://localhost:3000/auth/reset-password', { token, password }).subscribe(({

      next: (data: any) => {
        done();
      },
      error: (error) => {
        console.log(error)
        err(error)
      }

    }))
  }

  clearNotifications(): void {
    this.http.post('http://localhost:3000/users/clear-notifications', {}).subscribe(({

      next: async (data: any) => {
        console.log("data not", data)
        this.refreshUserData();        
      },
      error: (error) => {
        console.log(error)
      }

    }))
  }




}