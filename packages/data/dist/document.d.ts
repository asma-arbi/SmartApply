export type ValidFile = {
    bytes: Buffer;
    name: string;
    mime: string;
    hash: string;
    size: number;
};
export declare function validateFile(bytes: Buffer, name: string, limit?: number): Promise<ValidFile>;
export declare function docxText(bytes: Buffer): Promise<string>;
