import {
  registerDecorator,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ async: false })
export class MaxCharacterLimitConstraint implements ValidatorConstraintInterface {
  validate(messages: unknown, args: ValidationArguments): boolean {
    if (!Array.isArray(messages)) return false;

    const [maxCharacterLimit] = args.constraints as [number];

    const notRequiredType = messages.some(
      (message) => typeof message !== 'string',
    );

    if (notRequiredType) return false;

    const eachMsgSize = messages.map((message: string) => message.length);

    const total = eachMsgSize.reduce((partialSum, a) => partialSum + a, 0);
    return total <= maxCharacterLimit;
  }
}

export default function MaxCharacterLimit(count: number) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: undefined,
      constraints: [count],
      validator: MaxCharacterLimitConstraint,
    });
  };
}
