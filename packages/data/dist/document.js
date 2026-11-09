import { PDFDocument, PDFDict, PDFArray, PDFName } from 'pdf-lib';
import { XMLValidator } from 'fast-xml-parser';
import { fromBuffer } from 'yauzl';
import { createHash } from 'node:crypto';
import { DataError as DomainError } from './identity.js';
export async function validateFile(bytes, name, limit = 5 * 1024 * 1024) {
    if (!bytes.length || bytes.length > limit)
        throw new DomainError('FILE_SIZE', `Le fichier doit contenir des données et ne pas dépasser ${limit / 1024 / 1024} Mo.`);
    if (!name || name.length > 200 || /[\\/\x00-\x1f]/.test(name) || name.includes('..'))
        throw new DomainError('FILENAME', 'Le nom du fichier est invalide.');
    let mime = '';
    if (name.toLowerCase().endsWith('.pdf') && bytes.subarray(0, 5).toString() === '%PDF-') {
        try {
            const pdf = await PDFDocument.load(bytes);
            if (pdf.getPageCount() === 0)
                throw new Error();
            const forbidden = new Set(['JS', 'JavaScript', 'Launch', 'EmbeddedFile', 'EmbeddedFiles', 'RichMedia', 'OpenAction', 'AA']);
            function inspect(value) { if (value instanceof PDFName)
                return forbidden.has(value.decodeText()); if (value instanceof PDFArray)
                return value.asArray().some(inspect); if (value instanceof PDFDict)
                return value.entries().some(([k, v]) => forbidden.has(k.decodeText()) || inspect(v)); return false; }
            if (pdf.context.enumerateIndirectObjects().some(([, v]) => inspect(v)))
                throw new DomainError('UNSAFE_PDF', 'Ce PDF contient des actions ou pièces jointes actives non autorisées.');
            mime = 'application/pdf';
        }
        catch (e) {
            if (e instanceof DomainError)
                throw e;
            throw new DomainError('CORRUPT_PDF', 'Ce PDF est corrompu ou protégé et ne peut pas être utilisé.');
        }
    }
    else if (name.toLowerCase().endsWith('.docx') && bytes[0] === 0x50 && bytes[1] === 0x4b) {
        await new Promise((res, rej) => fromBuffer(bytes, { lazyEntries: true, validateEntrySizes: true }, (err, zip) => {
            if (err || !zip) {
                rej(new DomainError('CORRUPT_DOCX', 'Ce document DOCX est invalide.'));
                return;
            }
            let count = 0, total = 0, document = false, types = false, done = false;
            const fail = () => { if (done)
                return; done = true; zip.close(); rej(new DomainError('CORRUPT_DOCX', 'Ce document DOCX est corrompu ou contient des éléments non autorisés.')); };
            zip.on('error', fail);
            zip.on('end', () => { if (done)
                return; done = true; if (document && types)
                res();
            else
                rej(new DomainError('CORRUPT_DOCX', 'Le document Word ne contient pas les éléments requis.')); });
            zip.on('entry', entry => {
                count++;
                total += entry.uncompressedSize;
                if (count > 3000 || total > 20 * 1024 * 1024 || entry.generalPurposeBitFlag & 1 || /\\|(^|\/)\.\.(\/|$)|^\//.test(entry.fileName) || /vbaProject|word\/embeddings/i.test(entry.fileName)) {
                    fail();
                    return;
                }
                if (['word/document.xml', '[Content_Types].xml'].includes(entry.fileName)) {
                    zip.openReadStream(entry, (e, stream) => {
                        if (e || !stream) {
                            fail();
                            return;
                        }
                        const chunks = [];
                        let size = 0;
                        stream.on('data', (b) => { size += b.length; if (size > 10 * 1024 * 1024) {
                            stream.destroy();
                            fail();
                        }
                        else
                            chunks.push(b); });
                        stream.on('error', fail);
                        stream.on('end', () => {
                            if (done)
                                return;
                            const text = Buffer.concat(chunks).toString('utf8');
                            if (/<!DOCTYPE|<!ENTITY/i.test(text) || XMLValidator.validate(text) !== true) {
                                fail();
                                return;
                            }
                            if (entry.fileName === 'word/document.xml')
                                document = /<(?:\w+:)?document\b/.test(text) && /<\/(?:\w+:)?document>/.test(text);
                            else
                                types = text.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml');
                            zip.readEntry();
                        });
                    });
                }
                else
                    zip.readEntry();
            });
            zip.readEntry();
        }));
        mime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
    }
    else
        throw new DomainError('FILE_TYPE', 'Choisissez un fichier PDF ou DOCX valide.');
    return { bytes, name, mime, size: bytes.length, hash: createHash('sha256').update(bytes).digest('hex') };
}
export async function docxText(bytes) {
    return new Promise((resolveText, reject) => fromBuffer(bytes, { lazyEntries: true }, (error, zip) => {
        if (error || !zip) {
            reject(new DomainError('PREVIEW_UNAVAILABLE', 'Aperçu Word indisponible.'));
            return;
        }
        let found = false;
        zip.on('error', () => reject(new DomainError('PREVIEW_UNAVAILABLE', 'Aperçu Word indisponible.')));
        zip.on('end', () => { if (!found)
            reject(new DomainError('PREVIEW_UNAVAILABLE', 'Aperçu Word indisponible.')); });
        zip.on('entry', entry => { if (entry.fileName !== 'word/document.xml') {
            zip.readEntry();
            return;
        } found = true; zip.openReadStream(entry, (err, stream) => { if (err || !stream) {
            zip.close();
            reject(new DomainError('PREVIEW_UNAVAILABLE', 'Aperçu Word indisponible.'));
            return;
        } const chunks = []; stream.on('data', (b) => chunks.push(b)); stream.on('error', reject); stream.on('end', () => { zip.close(); const xml = Buffer.concat(chunks).toString('utf8'); const paragraphs = xml.split(/<\/w:p>/); const text = paragraphs.map(p => [...p.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map(m => m[1]).join('')).join('\n'); resolveText(text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')); }); }); });
        zip.readEntry();
    }));
}
