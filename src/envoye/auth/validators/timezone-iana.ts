import {
  ValidationArguments,
  ValidatorConstraintInterface,
  ValidatorConstraint,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class IsValidIANATimezoneConstraint implements ValidatorConstraintInterface {
  validate(value: any): boolean {
    if (typeof value !== 'string') return false;
    return Intl.supportedValuesOf('timeZone').includes(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.value} must be a valid IANA timezone`;
  }
}
