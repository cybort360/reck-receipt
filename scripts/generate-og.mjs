import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const W = 1200;
const H = 630;
const PAD = 72;

const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');

// Background
ctx.fillStyle = '#0a0a0a';
ctx.fillRect(0, 0, W, H);

// Title -- 'RektReceipt'
ctx.fillStyle = '#ffffff';
ctx.font = 'bold 80px sans-serif';
ctx.fillText('RektReceipt', PAD, PAD + 72);

// Tagline
ctx.fillStyle = '#555555';
ctx.font = '28px sans-serif';
ctx.fillText('Find out how much Solana has taken from you.', PAD, PAD + 72 + 48);

// Center receipt card
const cardW = 500;
const cardH = 180;
const cardX = (W - cardW) / 2;
const cardY = (H - cardH) / 2;
const radius = 16;

// Card background
ctx.fillStyle = '#111111';
ctx.beginPath();
ctx.roundRect(cardX, cardY, cardW, cardH, radius);
ctx.fill();

// Card border
ctx.strokeStyle = '#2a2a2a';
ctx.lineWidth = 2;
ctx.setLineDash([8, 6]);
ctx.beginPath();
ctx.roundRect(cardX, cardY, cardW, cardH, radius);
ctx.stroke();
ctx.setLineDash([]);

// 'TOTAL REKT' label
ctx.fillStyle = '#555555';
ctx.font = '13px sans-serif';
ctx.letterSpacing = '4px';
ctx.fillText('TOTAL REKT', cardX + 40, cardY + cardH / 2 + 6);

// '???' value in red
ctx.fillStyle = '#f87171';
ctx.font = 'bold 48px sans-serif';
const redText = '???';
const redMetrics = ctx.measureText(redText);
ctx.fillText(redText, cardX + cardW - 40 - redMetrics.width, cardY + cardH / 2 + 18);

// Bottom right domain
ctx.fillStyle = '#333333';
ctx.font = '20px sans-serif';
const domain = 'rektreceipt.vercel.app';
const domainMetrics = ctx.measureText(domain);
ctx.fillText(domain, W - PAD - domainMetrics.width, H - PAD + 20);

// Save to public/og.png
const out = join(__dirname, '..', 'public', 'og.png');
writeFileSync(out, canvas.toBuffer('image/png'));
console.log(`OG image written to ${out}`);
