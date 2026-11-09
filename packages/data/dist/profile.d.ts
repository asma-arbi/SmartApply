import { z } from 'zod';
import { type Connection, type Model } from 'mongoose';
import { type Principal } from './identity.js';
export declare const profileSchema: z.ZodObject<{
    version: z.ZodNumber;
    name: z.ZodDefault<z.ZodString>;
    objective: z.ZodDefault<z.ZodString>;
    city: z.ZodDefault<z.ZodString>;
    education: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        organization: z.ZodDefault<z.ZodString>;
        description: z.ZodDefault<z.ZodString>;
        start: z.ZodOptional<z.ZodString>;
        end: z.ZodOptional<z.ZodString>;
        current: z.ZodDefault<z.ZodBoolean>;
        url: z.ZodDefault<z.ZodString>;
        technologies: z.ZodDefault<z.ZodArray<z.ZodString>>;
        source: z.ZodDefault<z.ZodEnum<{
            extraction: "extraction";
            manual: "manual";
        }>>;
    }, z.core.$strict>>;
    experience: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        organization: z.ZodDefault<z.ZodString>;
        description: z.ZodDefault<z.ZodString>;
        start: z.ZodOptional<z.ZodString>;
        end: z.ZodOptional<z.ZodString>;
        current: z.ZodDefault<z.ZodBoolean>;
        url: z.ZodDefault<z.ZodString>;
        technologies: z.ZodDefault<z.ZodArray<z.ZodString>>;
        source: z.ZodDefault<z.ZodEnum<{
            extraction: "extraction";
            manual: "manual";
        }>>;
    }, z.core.$strict>>;
    projects: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        organization: z.ZodDefault<z.ZodString>;
        description: z.ZodDefault<z.ZodString>;
        start: z.ZodOptional<z.ZodString>;
        end: z.ZodOptional<z.ZodString>;
        current: z.ZodDefault<z.ZodBoolean>;
        url: z.ZodDefault<z.ZodString>;
        technologies: z.ZodDefault<z.ZodArray<z.ZodString>>;
        source: z.ZodDefault<z.ZodEnum<{
            extraction: "extraction";
            manual: "manual";
        }>>;
    }, z.core.$strict>>;
    skills: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        category: z.ZodDefault<z.ZodString>;
        proficiency: z.ZodDefault<z.ZodString>;
        source: z.ZodDefault<z.ZodEnum<{
            extraction: "extraction";
            manual: "manual";
        }>>;
    }, z.core.$strict>>;
}, z.core.$strict>;
export type Profile = z.infer<typeof profileSchema>;
export declare const emptyProfile: () => Profile;
export declare function profileModel(connection: Connection): Model<any, {}, {}, {}, any, any, any>;
export declare class ProfileRepository {
    private readonly model;
    constructor(model: Model<any>);
    get(principal: Principal): Promise<Profile>;
    save(principal: Principal, input: unknown): Promise<Profile>;
}
