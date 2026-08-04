import { PreVerification } from '@/generated/prisma/client';
import buildUsername from '@/common/build-username';

export class PointOfContact {
  firstName: string;
  lastName: string;
  email: string;
  username: string;

  constructor(
    firstName: string,
    lastName: string,
    email: string,
    username: string,
  ) {
    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email;
    this.username = username;
  }

  static from(preverificationDetails: PreVerification) {
    //TODO: https://github.com/exwestafrican/wagz/issues/286 remove buildusername logic
    return new PointOfContact(
      preverificationDetails.firstName,
      preverificationDetails.lastName,
      preverificationDetails.email,
      preverificationDetails.username!,
    );
  }

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
}
