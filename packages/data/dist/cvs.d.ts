import { type Connection, type ClientSession, type Model } from 'mongoose';
import { type Principal } from './identity.js';
import { PrivateCvFiles } from './files.js';
export type CvRecord = {
    id: string;
    user_id: string;
    original_filename: string;
    storage_path: string;
    mime_type: string;
    file_size: number;
    file_hash: string;
    is_primary: boolean;
    processing_status: string;
    extraction: unknown | null;
    created_at: string;
    updated_at: string;
};
export type SafeCv = Omit<CvRecord, 'user_id' | 'storage_path' | 'file_hash'>;
export declare function cvModel(connection: Connection): Model<any, {}, {}, {}, any, any, any>;
export declare class CvRepository {
    private readonly connection;
    readonly files: PrivateCvFiles;
    readonly model: Model<any>;
    constructor(connection: Connection);
    private ready;
    list(p: Principal): Promise<SafeCv[]>;
    owned(p: Principal, id: string, session?: ClientSession): Promise<CvRecord>;
    upload(p: Principal, bytes: Buffer, name: string, key: string, replaceId?: string): Promise<SafeCv>;
    primary(p: Principal, id: string): Promise<{
        message: string;
    }>;
    remove(p: Principal, id: string): Promise<{
        message: string;
    }>;
    deleteCv(p: Principal, id: string): Promise<{
        message: string;
    }>;
    delete(p: Principal, id: string): Promise<{
        message: string;
    }>;
}
