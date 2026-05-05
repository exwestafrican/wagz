import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export const USERNAME_REGEX = '^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$';
export const USERNAME_MIN_LENGTH = 2;
export const USERNAME_MAX_LENGTH = 50;
export const USERNAME_REGEX_ERROR_MESSAGE =
  'Username must start with a letter and may include ".", "_" or "-" between characters. It cannot end with a symbol or contain consecutive symbols.';

export function IsValidUsername() {
  return applyDecorators(
    Transform(({ value }: { value: string }) => value.toLowerCase()),
    IsString(),
    IsNotEmpty({ message: 'Username is required' }),
    MinLength(USERNAME_MIN_LENGTH, {
      message: `Username must be at least ${USERNAME_MIN_LENGTH} characters`,
    }),
    MaxLength(USERNAME_MAX_LENGTH, {
      message: `Username must be at most ${USERNAME_MAX_LENGTH} characters`,
    }),
    Matches(new RegExp(USERNAME_REGEX), {
      message: USERNAME_REGEX_ERROR_MESSAGE,
    }),
  );
}
