import type { Connection } from 'mongoose';
import { type Principal } from './identity.js';
export declare function asmaSession(connection: Connection, cookie: string, secret: string): Promise<Principal>;
