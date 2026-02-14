const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const projectRoot = path.resolve(__dirname, '..');
const outDir = path.join(projectRoot, 'extracted_docs');

const ensureDir = (dirPath) => {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
};

const sanitizeFilename = (name) => {
  return name
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
};

const listDocs = () => {
  const items = fs.readdirSync(projectRoot, { withFileTypes: true });
  const files = items
    .filter((d) => d.isFile())
    .map((d) => d.name)
    .filter((n) => /\.(pdf|docx)$/i.test(n));

  return files.map((f) => path.join(projectRoot, f));
};

const writeText = (sourcePath, text) => {
  ensureDir(outDir);
  const base = path.basename(sourcePath);
  const outName = sanitizeFilename(base) + '.txt';
  const outPath = path.join(outDir, outName);
  fs.writeFileSync(outPath, text, 'utf8');
  return outPath;
};

const extractPdf = async (filePath) => {
  const data = fs.readFileSync(filePath);
  const parsed = await pdfParse(data);
  const text = parsed.text || '';
  return text;
};

const extractDocx = async (filePath) => {
  const result = await mammoth.extractRawText({ path: filePath });
  return result.value || '';
};

const main = async () => {
  const docs = listDocs();

  if (docs.length === 0) {
    console.log('No .pdf/.docx files found in project root.');
    process.exit(0);
  }

  console.log('Found documents:');
  docs.forEach((d) => console.log('- ' + path.basename(d)));

  const results = [];

  for (const docPath of docs) {
    const ext = path.extname(docPath).toLowerCase();
    try {
      let text = '';
      if (ext === '.pdf') {
        text = await extractPdf(docPath);
      } else if (ext === '.docx') {
        text = await extractDocx(docPath);
      }

      const outPath = writeText(docPath, text);
      results.push({ source: docPath, out: outPath, chars: text.length });
      console.log(`Extracted: ${path.basename(docPath)} -> ${path.relative(projectRoot, outPath)} (${text.length} chars)`);
    } catch (err) {
      console.error(`Failed to extract ${path.basename(docPath)}: ${err.message}`);
    }
  }

  const indexLines = ['Extracted Documents Index', ''];
  for (const r of results) {
    indexLines.push(`${path.basename(r.source)} -> ${path.relative(projectRoot, r.out)} (chars: ${r.chars})`);
  }
  writeText(path.join(projectRoot, 'INDEX'), indexLines.join('\n'));

  console.log('Done.');
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
