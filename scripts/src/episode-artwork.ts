import { Resvg } from '@resvg/resvg-js';
import * as fs from 'fs';
import * as path from 'path';
import { findEpisodeFile } from './episode-audio';

export const COVER_TEMPLATE = 'assets/episode-cover.svg';
export const OG_TEMPLATE = 'assets/episode-og.svg';
export const FONT = 'assets/RubikMonoOne-Regular.ttf';

// The square cover matches the export-xdpi the template was drawn with. The
// open graph one is 1.91:1, the ratio Facebook and LinkedIn ask for, and the
// one that survives the 2:1 crop X applies to summary_large_image cards.
export const COVER_WIDTH = 1200;
export const OG_WIDTH = 1200;

// Ids the templates expose. The cover was drawn in Inkscape and kept its
// generated names; episode-og.svg names them after what they hold.
const COVER_NUMBER = 'tspan912-3';
const COVER_PHOTO = 'image1037';
const OG_NUMBER = 'og-number-line1';
const OG_PHOTO = 'image1037';
const OG_TITLE_LINES = ['og-title-line1', 'og-title-line2', 'og-title-line3'];
const OG_GUEST_LINES = ['og-guest-line1', 'og-guest-line2'];

// Where the text sits in episode-og.svg, in the template's own units. The band
// runs from under the logo lockup down to the top of the episode number.
const OG_TEXT_X = 7;
const OG_TEXT_WIDTH = 79;
const OG_BAND_TOP = 22;
// The episode number sits on a baseline of 68 at 7px, so its capitals start at
// roughly 63. Stopping the band at 58 keeps a clear gap above it.
const OG_BAND_BOTTOM = 58;

const OG_TITLE_MAX_SIZE = 13;
const OG_TITLE_MIN_SIZE = 4;
const OG_GUEST_MAX_SIZE = 4.6;
const OG_GUEST_MIN_SIZE = 2.5;

// Rubik Mono One has no descender-free cap metric to hand, and resvg positions
// from the baseline, so these two ratios approximate the cap height and the
// leading well enough to centre a block of it by eye.
const CAP_HEIGHT = 0.72;
const TITLE_LEADING = 1.15;
const GUEST_LEADING = 1.2;

// The guest line has to stay clearly subordinate to the title, and clearly
// separated from it: without the cap a three line title shrinks to roughly the
// size of the guest line, and without the gap the two blocks read as one.
const GUEST_TO_TITLE_RATIO = 0.55;
const GAP_TO_TITLE_RATIO = 0.5;
const MIN_GAP = 3.5;

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
};

const SUPPORTED_MIME_TYPES = new Set(Object.values(MIME_TYPES));

const DOWNLOAD_TIMEOUT = 30_000;

export interface CoverImage {
  mimeType: string;
  encoded: string;
}

export interface EpisodeTitle {
  title: string;
  guest?: string;
}

export function episodeId(number: number): string {
  return number.toString().padStart(2, '0');
}

function mimeTypeOf(source: string): string | undefined {
  return MIME_TYPES[path.extname(source).toLowerCase()];
}

function unsupported(format: string, source: string): never {
  throw new Error(`Unsupported image format: ${format || source}. Supported formats: png, jpeg, gif, webp.`);
}

function readImage(imagePath: string): CoverImage {
  if (!fs.existsSync(imagePath)) {
    throw new Error(`Image not found: ${imagePath}`);
  }

  const mimeType = mimeTypeOf(imagePath);
  if (!mimeType) {
    unsupported(path.extname(imagePath).toLowerCase(), imagePath);
  }

  return { mimeType, encoded: fs.readFileSync(imagePath).toString('base64') };
}

async function downloadImage(url: string): Promise<CoverImage> {
  const response = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT) });
  if (!response.ok) {
    throw new Error(`Could not download ${url}: ${response.status} ${response.statusText}`);
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

export function isUrl(source: string): boolean {
  return /^https?:\/\//i.test(source);
}

export function loadImage(source: string): Promise<CoverImage> | CoverImage {
  return isUrl(source) ? downloadImage(source) : readImage(source);
}

// The templates draw no background: Inkscape used to bake in the colour of the
// page itself when exporting, so the artwork on the site has a yellow backdrop.
function backgroundColor(svg: string, template: string): string {
  const pageColor = svg.match(/pagecolor="(#[0-9a-fA-F]{6})"/);
  if (!pageColor) {
    throw new Error(`Could not find the page color in ${template}.`);
  }
  return pageColor[1];
}

function fontOptions() {
  return { fontFiles: [FONT], loadSystemFonts: false, defaultFontFamily: 'Rubik Mono One' };
}

export function renderPng(svg: string, width: number, template: string): Buffer {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    background: backgroundColor(svg, template),
    font: fontOptions(),
  });
  return resvg.render().asPng();
}

// Rubik Mono One is monospaced, so a single advance describes every string.
// Measure it from the font rather than hardcoding a ratio, and take it as the
// difference between two runs of different lengths: that cancels out the side
// bearings a single measurement would fold in.
let cachedAdvance: number | undefined;

function advancePerEm(): number {
  if (cachedAdvance !== undefined) {
    return cachedAdvance;
  }

  const probe = (count: number) => {
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4000 400">` +
      `<text x="0" y="200" style="font-size:100px;font-family:'Rubik Mono One'">${'M'.repeat(count)}</text></svg>`;
    return new Resvg(svg, { font: fontOptions() }).getBBox()?.width ?? 0;
  };

  const advance = (probe(30) - probe(10)) / 20 / 100;
  if (!(advance > 0)) {
    throw new Error(`Could not measure ${FONT}. Run this script from the scripts/ folder.`);
  }

  cachedAdvance = advance;
  return advance;
}

// Greedy wrap. Returns undefined when a single word cannot fit, which is the
// signal to try a smaller size rather than to overflow the canvas.
function wrap(text: string, width: number, size: number): string[] | undefined {
  const perLine = Math.floor(width / (size * advancePerEm()));
  if (perLine < 1) {
    return undefined;
  }

  const lines: string[] = [];
  let current = '';

  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (word.length > perLine) {
      return undefined;
    }
    if (!current) {
      current = word;
    } else if (current.length + 1 + word.length <= perLine) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) {
    lines.push(current);
  }
  return lines;
}

interface FittedText {
  size: number;
  lines: string[];
}

// Largest size that wraps into at most maxLines. Stepping down by a quarter of
// a unit is finer than the eye can tell at 1200px and keeps the scan cheap.
function fitText(text: string, width: number, maxLines: number, maxSize: number, minSize: number): FittedText {
  const STEP = 0.25;
  const steps = Math.floor((maxSize - minSize) / STEP);

  for (let index = 0; index <= steps; index++) {
    // Rounded because the cap on the guest size is a fraction of the title's,
    // which otherwise drags float noise all the way into the SVG.
    const size = round(maxSize - index * STEP);
    const lines = wrap(text, width, size);
    if (lines && lines.length <= maxLines) {
      return { size, lines };
    }
  }

  // Nothing fit, so take the floor and let it wrap as far as it needs to. Only
  // reachable for a title far longer than any the show has published.
  return { size: minSize, lines: wrap(text, width, minSize) ?? [text] };
}

// An episode is titled "#99 - Project with Guest". The feed splits on " - " and
// publishes the second half, so the artwork uses the same half. " with " is
// taken from the right, so a project whose own name contains it stays intact.
export function readEpisodeTitle(number: number): EpisodeTitle {
  const episodePath = findEpisodeFile(number);
  const front = fs.readFileSync(episodePath, 'utf8').match(/^title: *"(.*)" *$/m);

  if (!front) {
    throw new Error(`Could not find the title in ${episodePath}.`);
  }

  const separator = front[1].indexOf(' - ');
  const full = separator === -1 ? front[1] : front[1].slice(separator + 3);
  const guestAt = full.lastIndexOf(' with ');

  if (guestAt === -1) {
    return { title: full };
  }
  return { title: full.slice(0, guestAt), guest: full.slice(guestAt + ' with '.length) };
}

function setPhoto(svg: string, id: string, template: string, cover?: CoverImage): string {
  const element = new RegExp(`<image[^>]*id="${id}"[^>]*/>`);
  if (!element.test(svg)) {
    throw new Error(`Could not find the cover image (#${id}) in ${template}.`);
  }

  if (!cover) {
    return svg.replace(element, '');
  }

  return svg.replace(element, (tag) =>
    tag
      .replace(/xlink:href="[^"]*"/, `xlink:href="data:${cover.mimeType};base64,${cover.encoded}"`)
      // The slot is square: fill it and crop the overflow rather than squashing the image.
      .replace(/preserveAspectRatio="[^"]*"/, 'preserveAspectRatio="xMidYMid slice"'),
  );
}

function setText(svg: string, id: string, template: string, content: string): string {
  const tspan = new RegExp(`(<tspan[^>]*id="${id}"[^>]*>)[^<]*(</tspan>)`);
  if (!tspan.test(svg)) {
    throw new Error(`Could not find #${id} in ${template}.`);
  }
  return svg.replace(tspan, `$1${escapeText(content)}$2`);
}

function escapeText(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Rewrites one of the wrapped lines: its text, its baseline and its size. The
// empty lines are self closing in the template, so this also has to cope with
// a tspan that has no closing tag yet.
function setLine(svg: string, id: string, template: string, content: string, y: number, size: number): string {
  const element = new RegExp(`<tspan[^>]*id="${id}"[^>]*(?:/>|>[^<]*</tspan>)`);
  if (!element.test(svg)) {
    throw new Error(`Could not find #${id} in ${template}.`);
  }

  return svg.replace(element, (tag) => {
    const open = tag
      // Drop whichever tail the line currently has, empty or not.
      .replace(/\s*\/>$/, '')
      .replace(/>[^<]*<\/tspan>$/, '')
      .replace(/y="[^"]*"/, `y="${round(y)}"`)
      .replace(/font-size:[0-9.]+px/g, `font-size:${round(size)}px`);
    return `${open}>${escapeText(content)}</tspan>`;
  });
}

function round(value: number): number {
  return Number(value.toFixed(3));
}

export interface OgArtwork {
  title: FittedText;
  guest?: FittedText;
  // False when even the smallest size overflows the band, which no published
  // episode does, but which is worth surfacing rather than drawing over the logo.
  fits: boolean;
}

interface Block extends OgArtwork {
  titleCap: number;
  titleLeading: number;
  titleHeight: number;
  gap: number;
  guestCap: number;
  guestLeading: number;
  height: number;
}

function measure(title: FittedText, guest: FittedText | undefined, fits: boolean): Block {
  const titleCap = title.size * CAP_HEIGHT;
  const titleLeading = title.size * TITLE_LEADING;
  const titleHeight = titleCap + (title.lines.length - 1) * titleLeading;

  const gap = guest ? Math.max(MIN_GAP, title.size * GAP_TO_TITLE_RATIO) : 0;
  const guestCap = guest ? guest.size * CAP_HEIGHT : 0;
  const guestLeading = guest ? guest.size * GUEST_LEADING : 0;
  const guestHeight = guest ? guestCap + (guest.lines.length - 1) * guestLeading : 0;

  return {
    title,
    guest,
    fits,
    titleCap,
    titleLeading,
    titleHeight,
    gap,
    guestCap,
    guestLeading,
    height: titleHeight + gap + guestHeight,
  };
}

// Fits the title and the guest line together, against the height of the band
// rather than the width of a line. Width alone is not the binding constraint: a
// title of short words ("Compose Hot Reload") satisfies it at the largest size
// and simply takes a third line, which is how a block twice the height of the
// band ends up centred over the logo and the episode number.
function fitBlock(episode: EpisodeTitle, width: number, height: number): Block {
  const STEP = 0.25;
  const steps = Math.round((OG_TITLE_MAX_SIZE - OG_TITLE_MIN_SIZE) / STEP);
  let smallest: Block | undefined;

  for (let index = 0; index <= steps; index++) {
    const size = round(OG_TITLE_MAX_SIZE - index * STEP);
    const lines = wrap(episode.title, width, size);
    if (!lines || lines.length > OG_TITLE_LINES.length) {
      continue;
    }

    const guest = episode.guest
      ? fitText(
          `with ${episode.guest}`,
          width,
          OG_GUEST_LINES.length,
          Math.min(OG_GUEST_MAX_SIZE, round(size * GUEST_TO_TITLE_RATIO)),
          OG_GUEST_MIN_SIZE,
        )
      : undefined;

    const block = measure({ size, lines }, guest, true);
    if (block.height <= height) {
      return block;
    }
    smallest = block;
  }

  // Nothing fit. Draw the smallest attempt and let the caller say so.
  const fallback = smallest ?? measure(fitText(episode.title, width, OG_TITLE_LINES.length, OG_TITLE_MAX_SIZE, OG_TITLE_MIN_SIZE), undefined, false);
  return { ...fallback, fits: false };
}

export function renderOg(template: string, number: number, episode: EpisodeTitle, cover?: CoverImage): { png: Buffer; layout: OgArtwork } {
  let svg = fs.readFileSync(template, 'utf8');

  const bandHeight = OG_BAND_BOTTOM - OG_BAND_TOP;
  const block = fitBlock(episode, OG_TEXT_WIDTH, bandHeight);
  const { title, guest, titleCap, titleLeading, titleHeight, gap, guestCap, guestLeading } = block;

  // Centre the whole block in the band, so a one line title does not leave the
  // canvas looking bottom heavy and a three line one does not crowd the number.
  const top = OG_BAND_TOP + (bandHeight - block.height) / 2;

  OG_TITLE_LINES.forEach((id, index) => {
    const content = title.lines[index] ?? '';
    svg = setLine(svg, id, template, content, top + titleCap + index * titleLeading, title.size);
  });

  const guestTop = top + titleHeight + gap;
  OG_GUEST_LINES.forEach((id, index) => {
    const content = guest?.lines[index] ?? '';
    const size = guest?.size ?? OG_GUEST_MAX_SIZE;
    svg = setLine(svg, id, template, content, guestTop + guestCap + index * guestLeading, size);
  });

  svg = setText(svg, OG_NUMBER, template, `#${episodeId(number)}`);
  svg = setPhoto(svg, OG_PHOTO, template, cover);

  return { png: renderPng(svg, OG_WIDTH, template), layout: { title, guest, fits: block.fits } };
}

// Where the artwork lives, relative to the scripts folder, and how the posts
// refer to the same file.
export function artworkPath(number: number, kind: 'cover' | 'og'): string {
  return `../assets/images/episodes/${episodeId(number)}-${kind}.png`;
}

export function artworkUrl(number: number, kind: 'cover' | 'og'): string {
  return `/assets/images/episodes/${episodeId(number)}-${kind}.png`;
}

// Points header.og_image at the wide artwork. podcast_image is deliberately
// left alone: that one is the podcast artwork, and iTunes wants it square.
export function linkOgImage(number: number): { episodePath: string; changed: boolean } {
  const episodePath = findEpisodeFile(number);
  const episode = fs.readFileSync(episodePath, 'utf8');
  const url = artworkUrl(number, 'og');

  // Anchored so it cannot reach podcast_image, which ends in the same word.
  const key = /^(\s*)og_image: *.*$/m;
  if (!key.test(episode)) {
    throw new Error(`Could not find og_image in ${episodePath}.`);
  }

  const updated = episode.replace(key, (_line, indent: string) => `${indent}og_image: "${url}"`);
  if (updated === episode) {
    return { episodePath, changed: false };
  }

  fs.writeFileSync(episodePath, updated);
  return { episodePath, changed: true };
}

export function renderCover(template: string, number: number, cover?: CoverImage): Buffer {
  let svg = fs.readFileSync(template, 'utf8');
  svg = setText(svg, COVER_NUMBER, template, `#${episodeId(number)}`);
  svg = setPhoto(svg, COVER_PHOTO, template, cover);
  return renderPng(svg, COVER_WIDTH, template);
}
