import { z } from 'zod';
import type { Connection } from 'mongoose';
import { type Principal } from './identity.js';
export declare const accountRegistration: z.ZodObject<{
    email: z.ZodPipe<z.ZodEmail, z.ZodTransform<string, string>>;
    name: z.ZodString;
    password: z.ZodString;
    role: z.ZodEnum<{
        candidat: "candidat";
        entreprise: "entreprise";
    }>;
    companyName: z.ZodDefault<z.ZodString>;
    aiCvConsent: z.ZodDefault<z.ZodBoolean>;
}, z.core.$strict>;
export declare function normalizedRole(role: string): Principal['role'];
export declare class AccountRepository {
    connection: Connection;
    constructor(connection: Connection);
    private get db();
    register(input: unknown): Promise<{
        id: `${string}-${string}-${string}-${string}-${string}`;
        email: string;
    }>;
    activeUser(id: string): Promise<import("mongodb").WithId<import("bson").Document>>;
    authorize(p: Principal, role?: Principal['role']): Promise<import("mongodb").WithId<import("bson").Document>>;
    adminUser(p: Principal, id: string, change: {
        active?: boolean;
        role?: string;
    }): Promise<void>;
    updateAccount(p: Principal, input: unknown): Promise<void>;
}
