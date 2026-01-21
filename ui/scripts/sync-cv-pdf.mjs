import fs from 'node:fs/promises';
import path from 'node:path';

const CONTENT_REPO_DIR = process.env.RESUME_WEB_CONTENT_DIR
  ? path.resolve(process.env.RESUME_WEB_CONTENT_DIR)
  : path.resolve(process.cwd(), '../../resume_web_content');

const SOURCE_PDF = path.join(CONTENT_REPO_DIR, 'ui/public/jaan-sokk-cv.pdf');
const DEST_PDF = path.join(process.cwd(), 'public/jaan-sokk-cv.pdf');

async function main() {
  try {
    await fs.access(SOURCE_PDF);
  } catch {
    throw new Error(
      [
        `Missing CV PDF at: ${SOURCE_PDF}`,
        'Fix by:',
        '- ensuring the sibling repo exists at ../../resume_web_content, or',
        '- setting RESUME_WEB_CONTENT_DIR to the resume_web_content path, and',
        '- placing the file at ui/public/jaan-sokk-cv.pdf inside that repo.',
      ].join('\n'),
    );
  }

  await fs.mkdir(path.dirname(DEST_PDF), { recursive: true });
  await fs.copyFile(SOURCE_PDF, DEST_PDF);

  // eslint-disable-next-line no-console
  console.log(`Synced CV PDF → ${path.relative(process.cwd(), DEST_PDF)}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err?.message || err);
  process.exit(1);
});

