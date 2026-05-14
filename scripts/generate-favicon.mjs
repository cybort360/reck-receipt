import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = resolve(__dirname, '../public');

const SIZE = 32;
const canvas = createCanvas(SIZE, SIZE);
const ctx = canvas.getContext('2d');

// Background
ctx.fillStyle = '#0a0a0a';
ctx.fillRect(0, 0, SIZE, SIZE);

// Letter R
ctx.fillStyle = '#00ff9d';
ctx.font = 'bold 22px sans-serif';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText('R', SIZE / 2, SIZE / 2);

// Save PNG
const pngBuffer = canvas.toBuffer('image/png');
writeFileSync(resolve(publicDir, 'favicon.png'), pngBuffer);

// Save ICO (single 32x32 PNG-compressed entry)
// ICO format: ICONDIR (6) + ICONDIRENTRY (16) + PNG data
const icoHeader = Buffer.alloc(6);
icoHeader.writeUInt16LE(0, 0);  // reserved
icoHeader.writeUInt16LE(1, 2);  // type = 1 (icon)
icoHeader.writeUInt16LE(1, 4);  // image count = 1

const icoEntry = Buffer.alloc(16);
icoEntry.writeUInt8(SIZE, 0);          // width
icoEntry.writeUInt8(SIZE, 1);          // height
icoEntry.writeUInt8(0, 2);             // color count (0 = no palette)
icoEntry.writeUInt8(0, 3);             // reserved
icoEntry.writeUInt16LE(1, 4);          // color planes
icoEntry.writeUInt16LE(32, 6);         // bits per pixel
icoEntry.writeUInt32LE(pngBuffer.length, 8);  // size of image data
icoEntry.writeUInt32LE(22, 12);        // offset of image data (6 + 16)

const icoBuffer = Buffer.concat([icoHeader, icoEntry, pngBuffer]);
writeFileSync(resolve(publicDir, 'favicon.ico'), icoBuffer);

console.log(`favicon.png (${pngBuffer.length} bytes) → public/favicon.png`);
console.log(`favicon.ico (${icoBuffer.length} bytes) → public/favicon.ico`);
