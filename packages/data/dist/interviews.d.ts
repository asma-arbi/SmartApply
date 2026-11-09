import type { Connection } from 'mongoose';
import { z } from 'zod';
import { type Principal } from './identity.js';
export declare const interviewSchema: z.ZodObject<{
    version: z.ZodNumber;
    scheduledAt: z.ZodString;
    durationMinutes: z.ZodDefault<z.ZodNumber>;
    mode: z.ZodEnum<{
        VISIO: "VISIO";
        ONSITE: "ONSITE";
        PHONE: "PHONE";
    }>;
    location: z.ZodString;
    note: z.ZodDefault<z.ZodString>;
}, z.core.$strict>;
export declare class InterviewRepository {
    connection: Connection;
    constructor(connection: Connection);
    private get db();
    private requireRecruiter;
    private view;
    received(p: Principal): Promise<{
        id: any;
        jobId: any;
        jobTitle: any;
        candidateName: any;
        candidateEmail: any;
        candidateTitle: any;
        candidateCity: any;
        status: string;
        version: number;
        submittedAt: string | null;
        interview: {
            id: any;
            scheduledAt: string | null;
            durationMinutes: any;
            mode: any;
            location: any;
            note: any;
        } | null;
    }[]>;
    forApplication(p: Principal, appId: string): Promise<{
        id: any;
        scheduledAt: string | null;
        durationMinutes: any;
        mode: any;
        location: any;
        note: any;
    } | null>;
    schedule(p: Principal, appId: string, input: unknown, key: string): Promise<{
        applicationId: string;
        status: string;
        version: number;
        interview: {
            scheduledAt: string;
            durationMinutes: number;
            mode: "VISIO" | "ONSITE" | "PHONE";
            location: string;
            note: string;
        };
    }>;
}
