#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distCjsDir = join(__dirname, '..', 'dist', 'cjs');

function processFile(filePath) {
  if (!filePath.endsWith('.js')) return;

  const content = readFileSync(filePath, 'utf-8');
  const newContent = content.replace(/\.js(['"])/g, '.cjs$1');
  writeFileSync(filePath.replace(/\.js$/, '.cjs'), newContent);
}

function processDir(dir) {
  const files = readdirSync(dir);

  for (const file of files) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);

    if (stat.isDirectory()) {
      processDir(filePath);
    } else if (stat.isFile() && file.endsWith('.js')) {
      processFile(filePath);
    }
  }
}

processDir(distCjsDir);
console.log('✓ Fixed CommonJS imports');
