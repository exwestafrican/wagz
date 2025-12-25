import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

// Common temporary email domains
const DISPOSABLE_EMAIL_DOMAINS = [
  '10minutemail.com',
  'guerrillamail.com',
  'mailinator.com',
  'tempmail.com',
  'throwaway.email',
  'temp-mail.org',
  'getnada.com',
  'mohmal.com',
  'yopmail.com',
  'sharklasers.com',
  // Add more as needed
];

@ValidatorConstraint({ async: false })
export class IsNotDisposableEmailConstraint implements ValidatorConstraintInterface {
  validate(email: string): boolean {
    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) return false;

    const isDisposableEmail = DISPOSABLE_EMAIL_DOMAINS.includes(domain);
    return !isDisposableEmail;
  }
  defaultMessage(): string {
    return 'Invalid email address';
  }
}

// Decorator function that you use in DTOs
export function IsNotDisposableEmail(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [],
      validator: IsNotDisposableEmailConstraint,
    });
  };
}
