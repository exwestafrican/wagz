import { IsEmail } from 'class-validator';
import {
  IsNotDisposableEmail,
  IsNotDisposableEmailConstraint,
} from '@/common/validators/is-not-disposable-email.decorator';
import { validate } from 'class-validator';

class TestDto {
  @IsEmail()
  @IsNotDisposableEmail()
  email: string;
}

describe('IsNotDisposableEmail', () => {
  test.each([
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
  ])('it should fail for domain %s', async (domain: string) => {
    const dto = new TestDto();
    dto.email = `user@${domain}`;
    const errors = await validate(dto);

    expect(errors).toHaveLength(1);
  });

  test.each(['usenvoye.com', 'google.com', 'outlook.com'])(
    'it allows domain %s',
    async (domain: string) => {
      const dto = new TestDto();
      dto.email = `user@${domain}`;
      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    },
  );

  describe('IsNotDisposableEmailConstraint', () => {
    const constraint = new IsNotDisposableEmailConstraint();

    test.each([
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
    ])('it should fail for domain %s', (domain: string) => {
      const email = `user@${domain}`;
      expect(constraint.validate(email)).toBe(false);
    });

    test.each(['usenvoye.com', 'google.com', 'outlook.com'])(
      'it allows domain %s',
      (domain: string) => {
        const email = `user@${domain}`;
        expect(constraint.validate(email)).toBe(true);
      },
    );
  });
});
