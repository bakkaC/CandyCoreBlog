#!/usr/bin/env node
import { existsSync } from 'node:fs';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const imageExtensions = new Set([
  '.avif',
  '.gif',
  '.jpeg',
  '.jpg',
  '.png',
  '.svg',
  '.webp',
]);

const workspaceRoot = process.cwd();
const contentRoot = path.join(workspaceRoot, 'src/content');
const bucket = process.env.R2_BUCKET;
const publicUrl = trimTrailingSlash(process.env.R2_PUBLIC_URL ?? '');
const keyPrefix = normalizeKey(process.env.R2_KEY_PREFIX ?? '');
const dryRun = process.argv.includes('--dry-run') || process.env.R2_DRY_RUN === '1';
const skipUpload = process.argv.includes('--skip-upload') || process.env.R2_SKIP_UPLOAD === '1';

if (!bucket && !dryRun && !skipUpload) {
  exitWithConfigError('缺少 R2_BUCKET，例如：R2_BUCKET=bakka-assets');
}

if (!publicUrl) {
  exitWithConfigError('缺少 R2_PUBLIC_URL，例如：R2_PUBLIC_URL=https://img.bakkac.github.io');
}

const mdxFiles = await findFiles(contentRoot, (filePath) => filePath.endsWith('.mdx'));
let uploadedCount = 0;
let replacedCount = 0;
let missingCount = 0;

for (const mdxFile of mdxFiles) {
  const original = await readFile(mdxFile, 'utf8');
  const images = findMarkdownImages(original);
  let next = original;
  let offset = 0;

  for (const image of images) {
    const destination = parseDestination(image.destination);

    if (!destination || shouldSkipDestination(destination.url)) {
      continue;
    }

    const assetPath = resolveAssetPath(mdxFile, destination.url);

    if (!assetPath || !isImageFile(assetPath)) {
      continue;
    }

    if (!existsSync(assetPath)) {
      missingCount += 1;
      console.warn(`找不到图片：${relativePath(assetPath)}，引用自 ${relativePath(mdxFile)}`);
      continue;
    }

    const objectKey = buildObjectKey(assetPath);
    const nextUrl = buildPublicUrl(objectKey);
    const nextRawDestination = formatDestination(nextUrl, destination.wrapWithAngleBrackets);
    const nextImageMarkdown =
      image.raw.slice(0, image.destinationStartInRaw) +
      nextRawDestination +
      image.raw.slice(image.destinationEndInRaw);

    if (!skipUpload) {
      uploadAsset(assetPath, objectKey);
      uploadedCount += 1;
    }

    const start = image.start + offset;
    const end = image.end + offset;
    next = next.slice(0, start) + nextImageMarkdown + next.slice(end);
    offset += nextImageMarkdown.length - image.raw.length;
    replacedCount += 1;
  }

  if (next !== original && !dryRun) {
    await writeFile(mdxFile, next);
  }
}

const modeLabel = dryRun ? 'dry-run：' : '';
console.log(
  `${modeLabel}完成。上传 ${skipUpload ? 0 : uploadedCount} 个，替换 ${replacedCount} 处，缺失 ${missingCount} 个。`,
);

function exitWithConfigError(message) {
  console.error(message);
  console.error(
    '用法：R2_BUCKET=你的bucket R2_PUBLIC_URL=https://img.bakkac.github.io pnpm r2:assets',
  );
  process.exit(1);
}

async function findFiles(directory, filter) {
  const result = [];
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      result.push(...(await findFiles(entryPath, filter)));
    } else if (entry.isFile() && filter(entryPath)) {
      result.push(entryPath);
    }
  }

  return result;
}

function findMarkdownImages(markdown) {
  const result = [];
  let cursor = 0;

  while (cursor < markdown.length) {
    const imageStart = markdown.indexOf('![', cursor);

    if (imageStart === -1) {
      break;
    }

    const labelEnd = markdown.indexOf(']', imageStart + 2);

    if (labelEnd === -1 || markdown[labelEnd + 1] !== '(') {
      cursor = imageStart + 2;
      continue;
    }

    const destinationStart = labelEnd + 2;
    const destinationEnd = findClosingParen(markdown, destinationStart);

    if (destinationEnd === -1) {
      cursor = destinationStart;
      continue;
    }

    result.push({
      start: imageStart,
      end: destinationEnd + 1,
      raw: markdown.slice(imageStart, destinationEnd + 1),
      destination: markdown.slice(destinationStart, destinationEnd),
      destinationStartInRaw: destinationStart - imageStart,
      destinationEndInRaw: destinationEnd - imageStart,
    });
    cursor = destinationEnd + 1;
  }

  return result;
}

function findClosingParen(markdown, start) {
  let depth = 0;
  let inAngleBrackets = false;

  for (let index = start; index < markdown.length; index += 1) {
    const char = markdown[index];
    const previous = markdown[index - 1];

    if (previous === '\\') {
      continue;
    }

    if (char === '<') {
      inAngleBrackets = true;
      continue;
    }

    if (char === '>') {
      inAngleBrackets = false;
      continue;
    }

    if (inAngleBrackets) {
      continue;
    }

    if (char === '(') {
      depth += 1;
      continue;
    }

    if (char === ')') {
      if (depth === 0) {
        return index;
      }

      depth -= 1;
    }
  }

  return -1;
}

function parseDestination(rawDestination) {
  const trimmed = rawDestination.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed.startsWith('<')) {
    const end = trimmed.indexOf('>');

    if (end === -1) {
      return null;
    }

    return {
      url: trimmed.slice(1, end),
      wrapWithAngleBrackets: true,
    };
  }

  const titleStart = trimmed.search(/\s["']/);
  const url = titleStart === -1 ? trimmed : trimmed.slice(0, titleStart);

  return {
    url,
    wrapWithAngleBrackets: false,
  };
}

function shouldSkipDestination(url) {
  return (
    /^[a-z][a-z0-9+.-]*:/i.test(url) ||
    url.startsWith('//') ||
    url.startsWith('#') ||
    url.startsWith('/')
  );
}

function resolveAssetPath(mdxFile, rawUrl) {
  const withoutHash = rawUrl.split('#')[0];
  const withoutQuery = withoutHash.split('?')[0];
  let decodedUrl = withoutQuery;

  try {
    decodedUrl = decodeURIComponent(withoutQuery);
  } catch {
    decodedUrl = withoutQuery;
  }

  const candidates = [
    path.resolve(path.dirname(mdxFile), decodedUrl),
    path.resolve(getContentSectionRoot(mdxFile), decodedUrl),
  ];

  return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
}

function isImageFile(filePath) {
  return imageExtensions.has(path.extname(filePath).toLowerCase());
}

function buildObjectKey(filePath) {
  const relativeAssetPath = relativePath(filePath);
  return normalizeKey(path.posix.join(keyPrefix, relativeAssetPath));
}

function buildPublicUrl(objectKey) {
  return `${publicUrl}/${encodeObjectKey(objectKey)}`;
}

function encodeObjectKey(objectKey) {
  return objectKey
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function formatDestination(url, wrapWithAngleBrackets) {
  return wrapWithAngleBrackets ? `<${url}>` : url;
}

function uploadAsset(filePath, objectKey) {
  const objectTarget = `${bucket}/${objectKey}`;

  if (dryRun) {
    console.log(`[dry-run] upload ${relativePath(filePath)} -> ${objectTarget}`);
    return;
  }

  const localWrangler = path.join(workspaceRoot, 'node_modules/.bin/wrangler');
  const command = existsSync(localWrangler) ? localWrangler : 'pnpm';
  const args = existsSync(localWrangler)
    ? ['r2', 'object', 'put', objectTarget, '--file', filePath]
    : ['dlx', 'wrangler', 'r2', 'object', 'put', objectTarget, '--file', filePath];

  const result = spawnSync(command, args, {
    cwd: workspaceRoot,
    stdio: 'inherit',
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function relativePath(filePath) {
  return path.relative(workspaceRoot, filePath).split(path.sep).join('/');
}

function getContentSectionRoot(filePath) {
  const relativeToContent = path.relative(contentRoot, filePath);
  const [section] = relativeToContent.split(path.sep);
  return section ? path.join(contentRoot, section) : contentRoot;
}

function trimTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function normalizeKey(value) {
  return value.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
}
