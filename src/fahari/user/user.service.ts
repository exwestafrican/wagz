import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import {
  ChauffeurResponseDto,
  toChauffeurResponse,
} from '@/fahari/user/dto/chauffeur-response.dto';

@Injectable()
export class UserService {
  constructor(private readonly prismaService: PrismaService) {}

  // Temporary chauffeur definition: any user who is not a super admin.
  async listChauffeurs(): Promise<ChauffeurResponseDto[]> {
    const chauffeurs = await this.prismaService.user.findMany({
      where: { isSuperAdmin: false },
      orderBy: { id: 'asc' },
    });

    return chauffeurs.map(toChauffeurResponse);
  }
}
