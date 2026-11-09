import { type Connection, type ClientSession } from 'mongoose';
import { z } from 'zod';
import { type Principal } from './identity.js';
export declare const applicationSchema: z.ZodObject<{
    companyId: z.ZodString;
    jobId: z.ZodOptional<z.ZodString>;
    cvId: z.ZodString;
    type: z.ZodEnum<{
        JOB: "JOB";
        SPONTANEOUS: "SPONTANEOUS";
    }>;
    letterVersionId: z.ZodOptional<z.ZodString>;
    subject: z.ZodDefault<z.ZodString>;
    body: z.ZodDefault<z.ZodString>;
    answers: z.ZodDefault<z.ZodRecord<z.ZodString, z.ZodString>>;
    confirm: z.ZodOptional<z.ZodLiteral<true>>;
}, z.core.$strict>;
export declare function applicationModel(c: Connection): import("mongoose").Model<any, {}, {}, {}, any, any, any>;
export declare class ApplicationRepository {
    connection: Connection;
    constructor(connection: Connection);
    private ready;
    private get db();
    private validate;
    jobs(): Promise<(import("bson").Document & {
        _id: import("mongodb").ObjectId;
    })[]>;
    companies(): Promise<{
        id: any;
        name: any;
        city: any;
        technologies: any;
        opted_out: boolean;
    }[]>;
    private allowed;
    owned(p: Principal, appId: string, session?: ClientSession): Promise<any>;
    private decorate;
    list(p: Principal): Promise<any[]>;
    messagingContacts(p: Principal): Promise<({
        applicationId: any;
        conversationId: any;
        recipientId: any;
        recipientName: any;
        recipientEmail: any;
        recipientAvatar: any;
        jobTitle: any;
        applicationStatus: any;
        unread: number;
        updatedAt: any;
    } | null)[]>;
    messagingContact(p: Principal, applicationId: string): Promise<{
        applicationId: any;
        recipientId: any;
        recipientName: any;
        recipientEmail: any;
        jobTitle: any;
    }>;
    private cv;
    create(p: Principal, input: unknown, key: string): Promise<any>;
    detail(p: Principal, appId: string): Promise<any>;
    editDraft(p: Principal, appId: string, input: unknown): Promise<any>;
    saveNote(p: Principal, appId: string, input: unknown): Promise<{
        message: string;
    }>;
    transition(p: Principal, appId: string, input: unknown, key: string): Promise<any>;
}
