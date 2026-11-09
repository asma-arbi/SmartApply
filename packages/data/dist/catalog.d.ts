import type { Connection, ClientSession } from 'mongoose';
export declare class CatalogRepository {
    readonly connection: Connection;
    constructor(connection: Connection);
    private get db();
    company(id: string, session?: ClientSession): Promise<import("mongodb").WithId<import("bson").Document> | null>;
    job(id: string, session?: ClientSession): Promise<import("mongodb").WithId<import("bson").Document> | null>;
    companies(): Promise<(import("bson").Document & {
        _id: import("mongodb").ObjectId;
    })[]>;
    jobs(): Promise<(import("bson").Document & {
        _id: import("mongodb").ObjectId;
    })[]>;
    recruiterCompanies(userId: string, session?: ClientSession): Promise<(import("bson").Document & {
        _id: import("mongodb").ObjectId;
    })[]>;
}
