import MaxCharacterLimit from '@/common/validators/max-character-limit';
import { validate } from 'class-validator';

class TestDto {
  @MaxCharacterLimit(2000)
  message: string[];
}
describe('maxCharacterLimit', () => {
  test.each([
    { message: ['hey buddy', 'hi'] },
    { message: ['hello'] },
    { message: ['a'.repeat(2000)] },
    { message: ['a'.repeat(1000), 'b'.repeat(1000)] },
  ])('it should validate messages successfully', async ({ message }) => {
    const dto = new TestDto();
    dto.message = message;
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  test.each([
    { message: ['a'.repeat(2001)] },
    { message: ['a'.repeat(1000), 'b'.repeat(1001)] },
  ])('it should fail for invalid message', async ({ message }) => {
    const dto = new TestDto();
    dto.message = message;
    const errors = await validate(dto);
    expect(errors).toHaveLength(1);
  });
});
