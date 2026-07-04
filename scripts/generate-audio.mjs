// Generates all Hindi audio for the app via Google Cloud Text-to-Speech (Chirp3-HD voice).
// One-off batch job: run with `node scripts/generate-audio.mjs`.
// Requires: gcloud CLI authenticated, texttospeech.googleapis.com enabled on GCP_PROJECT.

import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

const GCP_PROJECT = process.env.GCP_PROJECT || 'ia-humanos-3d251e';
const VOICE_NAME = 'hi-IN-Chirp3-HD-Kore';
const LANGUAGE_CODE = 'hi-IN';

function getAccessToken() {
  return execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
}

async function synthesize(token, text) {
  const res = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'x-goog-user-project': GCP_PROJECT,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: { text },
      voice: { languageCode: LANGUAGE_CODE, name: VOICE_NAME },
      audioConfig: { audioEncoding: 'MP3', speakingRate: 0.92 },
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`TTS request failed (${res.status}): ${body}`);
  }
  const json = await res.json();
  return Buffer.from(json.audioContent, 'base64');
}

async function main() {
  const devanagari = JSON.parse(
    await import('node:fs/promises').then((fs) => fs.readFile(join(__dirname, 'devanagari.json'), 'utf8')),
  );

  const wordsDir = join(ROOT, 'public', 'audio', 'words');
  const grammarDir = join(ROOT, 'public', 'audio', 'grammar');
  mkdirSync(wordsDir, { recursive: true });
  mkdirSync(grammarDir, { recursive: true });

  let token = getAccessToken();
  let tokenIssuedAt = Date.now();
  const refreshToken = () => {
    // access tokens last ~1h; refresh every ~40 min to be safe during long batch runs
    if (Date.now() - tokenIssuedAt > 40 * 60 * 1000) {
      token = getAccessToken();
      tokenIssuedAt = Date.now();
    }
  };

  const wordEntries = Object.entries(devanagari.words);
  const grammarEntries = Object.entries(devanagari.grammarExamples);
  const total = wordEntries.length + grammarEntries.length;
  let done = 0;
  let failed = [];

  for (const [id, text] of wordEntries) {
    refreshToken();
    const path = join(wordsDir, `${id}.mp3`);
    try {
      const audio = await synthesize(token, text);
      writeFileSync(path, audio);
      done++;
      console.log(`[${done}/${total}] word ${id} -> ${audio.length} bytes`);
    } catch (err) {
      failed.push({ id, error: String(err) });
      console.error(`FAILED word ${id}: ${err}`);
    }
  }

  for (const [key, text] of grammarEntries) {
    refreshToken();
    const path = join(grammarDir, `${key}.mp3`);
    try {
      const audio = await synthesize(token, text);
      writeFileSync(path, audio);
      done++;
      console.log(`[${done}/${total}] grammar ${key} -> ${audio.length} bytes`);
    } catch (err) {
      failed.push({ id: key, error: String(err) });
      console.error(`FAILED grammar ${key}: ${err}`);
    }
  }

  console.log(`\nDone: ${done}/${total} generated.`);
  if (failed.length) {
    console.log(`Failed (${failed.length}):`, JSON.stringify(failed, null, 2));
    process.exitCode = 1;
  }
}

main();
