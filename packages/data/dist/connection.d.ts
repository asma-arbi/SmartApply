import { type Connection } from 'mongoose';
export declare function mongoConfiguration(env?: Record<string, string | undefined>): {
    uri: string;
    dbName: string;
};
export declare function connectDB(env?: Record<string, string | undefined>): Promise<Connection>;
export declare function closeDB(): Promise<void>;
