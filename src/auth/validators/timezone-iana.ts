import {
  ValidationArguments,
  ValidatorConstraintInterface,
  ValidatorConstraint,
} from 'class-validator';
import * as moment from 'moment-timezone';

@ValidatorConstraint({ async: false })
export class IsValidIANATimezoneConstraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    if (typeof value !== 'string') return false;
    return moment.tz.names().includes(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.value} must be a valid IANA timezone`;
  }
}
