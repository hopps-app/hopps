const fs = require('fs');
const path = require('path');

// Create a 6MB file (exceeds 5MB limit)
const size = 6 * 1024 * 1024; // 6MB
const buffer = Buffer.alloc(size, 'A');

// Create as a PDF-like file (starts with PDF header but is mostly padding)
const header = Buffer.from('%PDF-1.4\n');
const combined = Buffer.concat([header, buffer.slice(header.length)]);

const outPath = path.join(__dirname, 'test-large.pdf');
fs.writeFileSync(outPath, combined);
console.log('Large file created at', outPath, ':', fs.statSync(outPath).size, 'bytes');

// Also create a fake .exe file
const exePath = path.join(__dirname, 'test-malware.exe');
fs.writeFileSync(exePath, 'MZ fake exe content');
console.log('Exe file created at', exePath, ':', fs.statSync(exePath).size, 'bytes');
