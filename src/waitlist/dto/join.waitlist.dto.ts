import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { IsNotDisposableEmail } from '@/common/validators/is-not-disposable-email.decorator';

class JoinWaitListDto {
  @ApiProperty({ description: 'email of user wanting to join wait list' })
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value.trim().toLowerCase())
  @IsEmail({}, { message: 'Invalid email address' })
  @IsNotDisposableEmail()
  public email: string;
}

export default JoinWaitListDto;
