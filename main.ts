// Coralhold entry program: copies game/ and screenshots/ to the output
// directory and writes dossier.json with the kit's buildDossier. Standard
// library only, no network, no randomness: two runs write identical bytes.
import { cpSync, rmSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const REPO_ROOT = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR || '/output';
const TEXT_MAX_BYTES = 163840;

function cleanDir(path) {
  if (existsSync(path)) rmSync(path, { recursive: true, force: true });
}

function requireDir(path, label) {
  if (!existsSync(path)) {
    console.error('missing ' + label + ': ' + path);
    process.exit(1);
  }
}

requireDir(join(REPO_ROOT, 'game'), 'game/');
requireDir(join(REPO_ROOT, 'screenshots'), 'screenshots/');

mkdirSync(OUT_DIR, { recursive: true });
cleanDir(join(OUT_DIR, 'game'));
cleanDir(join(OUT_DIR, 'screenshots'));
cleanDir(join(OUT_DIR, 'dossier.json'));

cpSync(join(REPO_ROOT, 'game'), join(OUT_DIR, 'game'), { recursive: true });
cpSync(join(REPO_ROOT, 'screenshots'), join(OUT_DIR, 'screenshots'), { recursive: true });

const dossier = await buildDossier(OUT_DIR, { text_max_bytes: TEXT_MAX_BYTES });
writeFileSync(join(OUT_DIR, 'dossier.json'), dossier);
console.log('wrote ' + join(OUT_DIR, 'dossier.json') + ' (' + dossier.length + ' bytes)');
