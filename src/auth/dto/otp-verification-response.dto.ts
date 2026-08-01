import { ApiProperty } from '@nestjs/swagger';

export class OtpVerificationResponseDto {
  @ApiProperty({
    description:
      'The session access token returned after successful OTP verification',
    example: {
      access_token:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
    },
  })
  readonly accessToken: string;

  @ApiProperty({
    description:
      'The primary workspace code associated with the user after successful OTP verification',
    example: {
      workspaceCode: 'WORKSPACE_CODE',
    },
  })
  readonly workspaceCode: string;
}
