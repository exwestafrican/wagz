import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

export default function ApiForbiddenResponse() {
  return applyDecorators(
    ApiResponse({
      status: HttpStatus.FORBIDDEN,
      description: 'User is forbidden from action',
    }),
  );
}
