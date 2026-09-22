import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const trackedFiles = execFileSync(
  'git',
  [
    'ls-files',
    '-z',
    '--cached',
    '--others',
    '--exclude-standard',
    '--',
    'src',
    'app.json',
    '.github',
    'eas.json',
  ],
  { encoding: 'utf8' },
)
  .split('\0')
  .filter(Boolean);

const forbiddenPatterns = [
  ['OpenAI API key name', /OPENAI_API_KEY/],
  ['Supabase service-role key name', /SUPABASE_SERVICE_ROLE_KEY/],
  ['Supabase secret key', /sb_secret_[A-Za-z0-9_-]+/],
  ['OpenAI-style secret key', /\bsk-[A-Za-z0-9_-]{20,}\b/],
  ['database password name', /\b(?:DATABASE_PASSWORD|POSTGRES_PASSWORD)\b/],
];

const violations = [];

for (const file of trackedFiles) {
  const contents = readFileSync(file, 'utf8');

  for (const [description, pattern] of forbiddenPatterns) {
    if (pattern.test(contents)) {
      violations.push(`${file}: ${description}`);
    }
  }
}

if (violations.length > 0) {
  console.error('Privileged secret boundary violations found:');
  for (const violation of violations) {
    console.error(`- ${violation}`);
  }
  process.exitCode = 1;
} else {
  console.log('Mobile and build configuration secret boundaries are clean.');
}
