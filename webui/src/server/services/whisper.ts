import { exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync, existsSync, unlinkSync } from 'fs';
import { basename, dirname, join } from 'path';
import { getDb } from '../db/database.js';

const execAsync = promisify(exec);

export interface WhisperResult {
  text: string;
  srt: string;
}

export async function runWhisper(videoPath: string, language = 'en'): Promise<WhisperResult> {
  const db = getDb();
  const modelRow = db.prepare("SELECT value FROM settings WHERE key='whisper_model'").get() as { value: string } | undefined;
  const model = modelRow?.value || 'base';

  const outputDir = dirname(videoPath);
  const baseName = basename(videoPath, '.' + videoPath.split('.').pop());

  const cmd = [
    'whisper',
    `"${videoPath}"`,
    `--model ${model}`,
    `--language ${language}`,
    `--output_dir "${outputDir}"`,
    '--output_format srt',
    '--output_format txt',
    '--verbose False',
  ].join(' ');

  await execAsync(cmd, { maxBuffer: 50 * 1024 * 1024 });

  const txtPath = join(outputDir, `${baseName}.txt`);
  const srtPath = join(outputDir, `${baseName}.srt`);

  const text = existsSync(txtPath) ? readFileSync(txtPath, 'utf-8').trim() : '';
  const srt = existsSync(srtPath) ? readFileSync(srtPath, 'utf-8').trim() : '';

  // Cleanup temp files
  if (existsSync(txtPath)) unlinkSync(txtPath);
  if (existsSync(srtPath)) unlinkSync(srtPath);

  return { text, srt };
}
