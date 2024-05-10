import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { IUser, TAuthUser } from '../models/models';


const users: IUser[] = [
  {
    id: '0',
    email: 'teacher@mail.com',
    name: 'Teacher',
    role: 'teacher'
  },
  {
    id: '1',
    email: 'student1@mail.com',
    name: 'Student 1',
    role: 'student'
  }
]


@Injectable()
export class AuthService {

  private isLoggedInSubject = new BehaviorSubject<boolean>(this.hasToken());
  isLoggedIn: Observable<boolean> = this.isLoggedInSubject.asObservable();

  loggedUserSubject = new BehaviorSubject<TAuthUser | undefined>(this.getUser());
  loggedUser: Observable<TAuthUser | undefined> = this.loggedUserSubject.asObservable();

  constructor() { }

  login(email: string, password: string): void {

    //connect to api and get token
    const user = users.find(user => user.email === email);

    if (!user) {
      alert('User not found');
      return;
    }

    const { id, ...authUser } = user;    
    localStorage.setItem('user', JSON.stringify(authUser));
    localStorage.setItem('token', 'JWT');
    this.isLoggedInSubject.next(true);
    this.loggedUserSubject.next(user);
  }

  logout(): void {

    //connect to api to invalidate token
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    this.isLoggedInSubject.next(false);
    this.loggedUserSubject.next(undefined);
  }

  private hasToken(): boolean {
    return !!localStorage.getItem('token');
  }

  private getUser(): TAuthUser | undefined {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : undefined;
  }


}