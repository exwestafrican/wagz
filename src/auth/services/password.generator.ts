import { Injectable } from '@nestjs/common';
import { generate } from 'generate-password';

@Injectable()
export default class PasswordGenerator {
  generateRandomPassword(): string {
    return generate({
      length: 12,
      numbers: true,
      symbols: true,
      uppercase: true,
      lowercase: true,
      excludeSimilarCharacters: true, // Excludes i, l, 1, L, o, 0, O, etc.
      strict: true, // Ensures at least one character from each pool
    });
  }
}
