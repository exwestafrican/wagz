import { applyDecorators } from '@nestjs/common';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';
import { IsNotDisposableEmail } from './is-not-disposable-email.decorator';

export function IsValidEmail() {
  return applyDecorators(
    Transform(({ value }): string =>
      typeof value === 'string' ? value.trim().toLowerCase() : value,
    ),
    IsNotEmpty(),
    IsEmail({}, { message: 'Invalid email address in decorator' }),
    IsNotDisposableEmail({ message: 'Invalid email address' }),
  );
}
