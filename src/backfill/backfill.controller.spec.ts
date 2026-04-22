import { Test, TestingModule } from '@nestjs/testing';
import { BackfillController } from './backfill.controller';

describe('BackfillController', () => {
  let controller: BackfillController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BackfillController],
    }).compile();

    controller = module.get<BackfillController>(BackfillController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
