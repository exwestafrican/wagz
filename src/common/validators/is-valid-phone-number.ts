import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { isValidPhoneNumber } from 'libphonenumber-js';

export type PhoneNumberParts = {
  countryCallingCode: string;
  nationalNumber: string;
};

@ValidatorConstraint({ async: false })
export class IsValidPhoneNumberConstraint implements ValidatorConstraintInterface {
  validate(phoneNumber: PhoneNumberParts): boolean {
    if (!phoneNumber?.countryCallingCode || !phoneNumber?.nationalNumber) {
      return false;
    }

    return isValidPhoneNumber(
      `${phoneNumber.countryCallingCode}${phoneNumber.nationalNumber}`,
    );
  }

  defaultMessage(): string {
    return 'Invalid phone number';
  }
}
