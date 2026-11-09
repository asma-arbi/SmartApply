import type { Connection, ClientSession } from 'mongoose';
import { type Principal } from './identity.js';
export declare function ensureOperationIndexes(c: Connection): Promise<void>;
export declare function withOwnerTransaction<T>(c: Connection, p: Principal, work: (session: ClientSession) => Promise<T>): Promise<T>;
export declare function operationFingerprint(value: unknown): string;
export declare function runOperation<T>(c: Connection, p: Principal, key: string, kind: string, input: unknown, work: (session: ClientSession) => Promise<T>): Promise<T>;
export declare function toDTO<T>(record: T): T;
