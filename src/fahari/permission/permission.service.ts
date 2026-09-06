import { PrismaService } from '@/prisma/prisma.service';
import { ForbiddenException, Injectable } from '@nestjs/common';
import RequestUser from '@/auth/domain/request-user';
import { User } from '@/generated/prisma/client';

export type DenialException = new () => Error;

@Injectable()
export class FahariPermissionService {
  constructor(private readonly prismaService: PrismaService) {}

  async runIfSuperAdmin<T>(
    requestUser: RequestUser,
    authorizedAction: (user: User) => T,
    DenialException: DenialException = ForbiddenException,
  ): Promise<T> {
    const user = await this.prismaService.user.findUnique({
      where: { email: requestUser.email },
    });
    if (user?.isSuperAdmin) {
      return authorizedAction(user);
    }
    throw new DenialException();
  }
}
