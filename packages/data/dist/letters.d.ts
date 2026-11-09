import { type Connection, type Model } from 'mongoose';
import { z } from 'zod';
import { type Principal } from './identity.js';
export declare const createLetterSchema: z.ZodObject<{
    source: z.ZodDefault<z.ZodLiteral<"manual">>;
    company: z.ZodDefault<z.ZodString>;
    role: z.ZodDefault<z.ZodString>;
    jobDescription: z.ZodDefault<z.ZodString>;
    tone: z.ZodDefault<z.ZodEnum<{
        professional: "professional";
        enthusiastic: "enthusiastic";
        concise: "concise";
    }>>;
    emphasis: z.ZodDefault<z.ZodString>;
    cvId: z.ZodDefault<z.ZodNullable<z.ZodString>>;
    subject: z.ZodDefault<z.ZodString>;
    body: z.ZodDefault<z.ZodString>;
    title: z.ZodString;
    language: z.ZodEnum<{
        fr: "fr";
        en: "en";
    }>;
}, z.core.$strict>;
export declare const patchLetterSchema: z.ZodObject<{
    title: z.ZodOptional<z.ZodString>;
    language: z.ZodOptional<z.ZodEnum<{
        fr: "fr";
        en: "en";
    }>>;
    company: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodString>;
    jobDescription: z.ZodOptional<z.ZodString>;
    tone: z.ZodOptional<z.ZodEnum<{
        professional: "professional";
        enthusiastic: "enthusiastic";
        concise: "concise";
    }>>;
    emphasis: z.ZodOptional<z.ZodString>;
    cvId: z.ZodOptional<z.ZodNullable<z.ZodString>>;
    subject: z.ZodOptional<z.ZodString>;
    body: z.ZodOptional<z.ZodString>;
    version: z.ZodNumber;
}, z.core.$strict>;
export declare function letterModel(c: Connection): Model<any>;
export declare function letterVersionModel(c: Connection): Model<any>;
export declare class LetterRepository {
    private readonly connection;
    private letters?;
    private saved?;
    constructor(connection: Connection);
    private ready;
    private owned;
    private checkVersion;
    private checkCv;
    private profile;
    private snapshot;
    list(p: Principal): Promise<any[]>;
    get(p: Principal, id: string): Promise<any>;
    create(p: Principal, input: unknown, key: string, profileSnapshot?: unknown): Promise<any>;
    /** Trusted NestJS template command: the caller renders the fallback before invoking persistence. */
    createRenderedTemplate(p: Principal, input: unknown, key: string, profileSnapshot?: unknown): Promise<any>;
    private insert;
    patch(p: Principal, id: string, input: unknown): Promise<any>;
    versions(p: Principal, id: string): Promise<any[]>;
    saveVersion(p: Principal, id: string, input: unknown, key: string, profileSnapshot?: unknown): Promise<any>;
    restore(p: Principal, id: string, input: unknown, key: string): Promise<any>;
    remove(p: Principal, id: string): Promise<{
        message: string;
    }>;
    applyGenerated(p: Principal, id: string, expectedVersion: number, content: unknown, profileSnapshot: unknown, model?: string, completionJobId?: string): Promise<any>;
}
