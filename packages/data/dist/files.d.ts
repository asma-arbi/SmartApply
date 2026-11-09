import { type Connection } from 'mongoose';
import { type Principal } from './identity.js';
/** Byte storage. Domain services must validate content and enforce attachment retention. */
export declare class PrivateCvFiles {
    private bucket;
    private claims;
    constructor(connection: Connection);
    private scope;
    put(principal: Principal, cvId: string, bytes: Buffer, mime: string): Promise<string>;
    private owned;
    read(principal: Principal, cvId: string): Promise<Buffer<ArrayBuffer>>;
    remove(principal: Principal, cvId: string): Promise<void>;
}
