import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NextFunction, Request, Response } from 'express';
import { Actor, UserRole } from './actor';
import { AppModule } from './app.module';

const ROLES: UserRole[] = ['ENTERPRISE', 'CANDIDATE', 'ADMIN'];

function readActor(req: Request): Actor {
  const roleHeader = String(req.header('x-user-role') || 'ENTERPRISE').toUpperCase();
  const role = ROLES.includes(roleHeader as UserRole) ? (roleHeader as UserRole) : 'ENTERPRISE';
  return {
    userId: req.header('x-user-id') || 'user-recruteur-expensya',
    name: decodeURIComponent(req.header('x-user-name') || 'Ines Ben Salem'),
    email: req.header('x-user-email') || 'ines.bensalem@expensya.com',
    role,
    companyId: req.header('x-company-id') || undefined,
    companyName: req.header('x-company-name') ? decodeURIComponent(req.header('x-company-name') as string) : undefined,
  };
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key', 'x-user-id', 'x-user-role', 'x-user-name', 'x-user-email', 'x-company-id', 'x-company-name'],
  });
  app.use((req: Request & { actor?: Actor }, _res: Response, next: NextFunction) => {
    req.actor = readActor(req);
    next();
  });
  const port = Number(process.env.PORT || 4000);
  await app.listen(port);
  console.log(`API NestJS sur http://localhost:${port}/api/v1`);
}

bootstrap();
