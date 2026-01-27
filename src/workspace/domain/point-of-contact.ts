import { PreVerification } from '@/generated/prisma/client';

export class PointOfContact {
  firstName: string;
  lastName: string;
  email: string;

  constructor(firstName: string, lastName: string, email: string) {
    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email;
  }

  static from(preverificationDetails: PreVerification) {
    return new PointOfContact(
      preverificationDetails.firstName,
      preverificationDetails.lastName,
      preverificationDetails.email,
    );
  }

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
