import type { Connection } from 'mongoose';
import { type Principal } from './identity.js';
export declare class TeamRepository {
    connection: Connection;
    constructor(connection: Connection);
    private get db();
    private accounts;
    private parse;
    company(p: Principal, input: unknown): Promise<void>;
    saveJob(p: Principal, input: unknown): Promise<void>;
    deleteJob(p: Principal, id: string): Promise<void>;
    companyStatus(p: Principal, id: string, status: string, reason?: string): Promise<void>;
    deleteCompany(p: Principal, id: string): Promise<void>;
    jobStatus(p: Principal, id: string, status: string): Promise<void>;
}
