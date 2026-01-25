import { Test, TestingModule } from '@nestjs/testing';
import { WorkspaceManager } from './workspace-manager.service';

describe('WorkspaceService', () => {
  let service: WorkspaceManager;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [WorkspaceManager],
    }).compile();

    service = module.get<WorkspaceManager>(WorkspaceManager);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
