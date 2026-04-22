import {
  Controller,
  Get,
  HttpStatus,
  Inject,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SupabaseAuthGuard } from '@/auth/guard/supabase.guard';
import BackfillResponseDto, {
  toBackfillResponseDto,
} from '@/backfill/dto/backfill-response.dto';
import {
  BACKFILL_REGISTRY,
  type Registry,
} from '@/backfill/backfill-registry.provider';

@Controller('backfill')
export class BackfillController {
  logger = new Logger(BackfillController.name);
  constructor(@Inject(BACKFILL_REGISTRY) private readonly registry: Registry) {}

  @Get('tasks')
  @ApiOperation({ summary: 'Get all backfill jobs' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'All jobs returns',
    type: Array<BackfillResponseDto>,
  })
  @UseGuards(SupabaseAuthGuard)
  list(): BackfillResponseDto[] {
    return this.registry.all().map((r) => toBackfillResponseDto(r));
  }
}
