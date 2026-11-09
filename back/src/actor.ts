import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

export type UserRole = 'ENTERPRISE' | 'CANDIDATE' | 'ADMIN';

export interface Actor {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
  companyId?: string;
  companyName?: string;
}

export const CurrentActor = createParamDecorator((_data: unknown, ctx: ExecutionContext): Actor => {
  return ctx.switchToHttp().getRequest<Request & { actor: Actor }>().actor;
});
