export interface BrowserZipFile {
  name: string;
  data: Uint8Array<ArrayBuffer>;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = (value & 1) !== 0 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date: Date): { date: number; time: number } {
  const year = Math.max(1980, date.getUTCFullYear());
  return {
    time: (date.getUTCHours() << 11) | (date.getUTCMinutes() << 5) | Math.floor(date.getUTCSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getUTCMonth() + 1) << 5) | date.getUTCDate(),
  };
}

function validateName(name: string): void {
  if (!name || name.startsWith('/') || name.includes('\\') || name.split('/').includes('..')) {
    throw new Error(`Unsafe ZIP entry name: ${name}`);
  }
}

function writeUint16(view: DataView, offset: number, value: number): void {
  view.setUint16(offset, value, true);
}

function writeUint32(view: DataView, offset: number, value: number): void {
  view.setUint32(offset, value, true);
}

export function createBrowserZip(files: BrowserZipFile[], modifiedAt = new Date()): Blob {
  if (files.length > 0xffff) throw new Error('Too many files for a ZIP archive');

  const localParts: Uint8Array<ArrayBuffer>[] = [];
  const centralParts: Uint8Array<ArrayBuffer>[] = [];
  const { date, time } = dosDateTime(modifiedAt);
  const encoder = new TextEncoder();
  let offset = 0;

  for (const file of files) {
    validateName(file.name);
    const name = encoder.encode(file.name);
    const crc = crc32(file.data);
    const localHeader = new Uint8Array(30);
    const localView = new DataView(localHeader.buffer);
    writeUint32(localView, 0, 0x04034b50);
    writeUint16(localView, 4, 20);
    writeUint16(localView, 6, 0x0800);
    writeUint16(localView, 8, 0);
    writeUint16(localView, 10, time);
    writeUint16(localView, 12, date);
    writeUint32(localView, 14, crc);
    writeUint32(localView, 18, file.data.byteLength);
    writeUint32(localView, 22, file.data.byteLength);
    writeUint16(localView, 26, name.byteLength);
    localParts.push(localHeader, name, file.data);

    const centralHeader = new Uint8Array(46);
    const centralView = new DataView(centralHeader.buffer);
    writeUint32(centralView, 0, 0x02014b50);
    writeUint16(centralView, 4, 20);
    writeUint16(centralView, 6, 20);
    writeUint16(centralView, 8, 0x0800);
    writeUint16(centralView, 10, 0);
    writeUint16(centralView, 12, time);
    writeUint16(centralView, 14, date);
    writeUint32(centralView, 16, crc);
    writeUint32(centralView, 20, file.data.byteLength);
    writeUint32(centralView, 24, file.data.byteLength);
    writeUint16(centralView, 28, name.byteLength);
    writeUint32(centralView, 42, offset);
    centralParts.push(centralHeader, name);

    offset += localHeader.byteLength + name.byteLength + file.data.byteLength;
  }

  const centralSize = centralParts.reduce((total, part) => total + part.byteLength, 0);
  if (offset + centralSize > 0xffffffff) throw new Error('ZIP archive exceeds 4 GB');

  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  writeUint32(endView, 0, 0x06054b50);
  writeUint16(endView, 8, files.length);
  writeUint16(endView, 10, files.length);
  writeUint32(endView, 12, centralSize);
  writeUint32(endView, 16, offset);

  return new Blob([...localParts, ...centralParts, end], { type: 'application/zip' });
}
