import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';
import ValidationErrorResponseDto from '@/common/dto/validation-error.dto';

export default function ApiBadRequestResponse() {
  return applyDecorators(
    ApiResponse({
      status: 400,
      description: 'User provided invalid input',
      type: ValidationErrorResponseDto,
    }),
  );
}
