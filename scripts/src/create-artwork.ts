import { Resvg } from '@resvg/resvg-js';
import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';

const TEMPLATE = 'assets/episode-cover.svg';
const FONT = 'assets/RubikMonoOne-Regular.ttf';

// All the artwork in assets/images/episodes is 1200x1200, matching the
// export-xdpi of 822.86 the template was originally exported with.
const RESOLUTION = 1200;

// Ids of the two elements of the template the script rewrites.
const NUMBER_TSPAN = 'tspan912-3';
const COVER_IMAGE = 'image1037';

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

const SUPPORTED_MIME_TYPES = new Set(Object.values(MIME_TYPES));

const DOWNLOAD_TIMEOUT = 30_000;

interface CoverImage {
  mimeType: string;
  encoded: string;
}

const program = new Command();

program
  .name('create-artwork')
  .description('Generate the cover artwork of a podcast episode')
  .version('1.0')
  .requiredOption('-n, --number <number>', 'Number of the episode', parseInt)
  .option('-i, --image <string>', 'Image to place in the bottom right corner, a path or an http(s) URL, omit to leave it empty')
  .option('-o, --output <string>', 'Where to write the PNG, defaults to the episodes folder');

program.parse(process.argv);

const options = program.opts();
const { number, image, output } = options;

function info(msg: string, emoji = 'ℹ️') {
  console.log(`${emoji}\t${msg}`);
}

function succ(msg: string) {
  console.log(`✅\t${msg}`);
}

function warn(msg: string) {
  console.log(`⚠️\t${msg}`);
}

function error(msg: string, err?: Error, code = 1): never {
  console.error(`❌\t${msg}`);
  if (err) console.error(err);
  process.exit(code);
}

function episodeId(): string {
  return number.toString().padStart(2, '0');
}

function setEpisodeNumber(svg: string): string {
  const tspan = new RegExp(`(id="${NUMBER_TSPAN}"[^>]*>)[^<]*(</tspan>)`);
  if (!tspan.test(svg)) {
    error(`Could not find the episode number (#${NUMBER_TSPAN}) in ${TEMPLATE}.`);
  }
  return svg.replace(tspan, `$1#${episodeId()}$2`);
}

function mimeTypeOf(source: string): string | undefined {
  return MIME_TYPES[path.extname(source).toLowerCase()];
}

function unsupported(format: string, source: string): never {
  return error(`Unsupported image format: ${format || source}. Supported formats: png, jpeg, gif, webp.`);
}

function readImage(imagePath: string): CoverImage {
  if (!fs.existsSync(imagePath)) {
    error(`Image not found: ${imagePath}`);
  }

  const mimeType = mimeTypeOf(imagePath);
  if (!mimeType) {
    unsupported(path.extname(imagePath).toLowerCase(), imagePath);
  }

  return { mimeType, encoded: fs.readFileSync(imagePath).toString('base64') };
}

async function downloadImage(url: string): Promise<CoverImage> {
  info(`Downloading ${url}...`, '🌍');

  const response = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT) });
  if (!response.ok) {
    error(`Could not download ${url}: ${response.status} ${response.statusText}`);
  }

  // Trust the server first, and fall back to the extension when it says nothing useful.
  const contentType = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
  const mimeType = SUPPORTED_MIME_TYPES.has(contentType ?? '') ? contentType! : mimeTypeOf(new URL(url).pathname);
  if (!mimeType) {
    unsupported(contentType ?? '', url);
  }

  const encoded = Buffer.from(await response.arrayBuffer()).toString('base64');
  return { mimeType, encoded };
}

function loadImage(source: string): Promise<CoverImage> | CoverImage {
  return /^https?:\/\//i.test(source) ? downloadImage(source) : readImage(source);
}

function setCoverImage(svg: string, cover?: CoverImage): string {
  const element = new RegExp(`<image[^>]*id="${COVER_IMAGE}"[^>]*/>`);
  if (!element.test(svg)) {
    error(`Could not find the cover image (#${COVER_IMAGE}) in ${TEMPLATE}.`);
  }

  if (!cover) {
    warn('No image provided, the bottom right corner will be left empty.');
    return svg.replace(element, '');
  }

  return svg.replace(element, (tag) =>
    tag
      .replace(/xlink:href="[^"]*"/, `xlink:href="data:${cover.mimeType};base64,${cover.encoded}"`)
      // The slot is square: fill it and crop the overflow rather than squashing the image.
      .replace(/preserveAspectRatio="[^"]*"/, 'preserveAspectRatio="xMidYMid slice"'),
  );
}

// The template draws no background: Inkscape used to bake in the colour of the
// page itself when exporting, so the artwork on the site has a yellow backdrop.
function backgroundColor(svg: string): string {
  const pageColor = svg.match(/pagecolor="(#[0-9a-fA-F]{6})"/);
  if (!pageColor) {
    error(`Could not find the page color in ${TEMPLATE}.`);
  }
  return pageColor[1];
}

function renderPng(svg: string): Buffer {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: RESOLUTION },
    background: backgroundColor(svg),
    font: {
      fontFiles: [FONT],
      loadSystemFonts: false,
      defaultFontFamily: 'Rubik Mono One',
    },
  });
  return resvg.render().asPng();
}

async function main() {
  try {
    info("🎨🎨🎨 create-artwork 🎨🎨🎨");
    info("Welcome to create-artwork", "👋");
    info("Creating your artwork...");

    if (!fs.existsSync(TEMPLATE)) {
      error(`Template not found: ${TEMPLATE}. Run this script from the scripts/ folder.`);
    }

    const template = fs.readFileSync(TEMPLATE, 'utf8');
    const cover = image ? await loadImage(image) : undefined;
    const svg = setCoverImage(setEpisodeNumber(template), cover);
    const filename = output ?? `../assets/images/episodes/${episodeId()}-cover.png`;

    fs.writeFileSync(filename, renderPng(svg));

    info(`Episode number: #${episodeId()}`);
    info(`Cover image: ${image ?? 'none'}`);
    info(`Resolution: ${RESOLUTION}x${RESOLUTION}`);

    succ(`Artwork created successfully: ${filename}`);
  } catch (err) {
    error('Something went wrong creating the artwork.', err as Error);
  }
}

main();
