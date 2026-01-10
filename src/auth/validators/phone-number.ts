import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { PhoneNumberDto } from '@/auth/dto/phone-number.dto';
import { isValidPhoneNumber } from 'libphonenumber-js';

@ValidatorConstraint({ async: false })
export class IsValidPhoneNumberConstraint implements ValidatorConstraintInterface {
  validate(dto: PhoneNumberDto): boolean {
    const phoneNumber = `${dto.countryCallingCode}${dto.nationalNumber}`;
    return isValidPhoneNumber(phoneNumber);
  }

  defaultMessage(): string {
    return 'Invalid phone number';
  }
}
