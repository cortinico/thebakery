import * as fs from 'fs';
import * as path from 'path';

export const POSTS_DIR = '../_posts';

export interface AudioUpdate {
  length: number;
  duration: string;
  url: string;
  // Set when the audio file is not the one the episode was pointing at.
  previousUrl?: string;
}

interface Box {
  start: number;
  end: number;
}

// An MP4 file is a tree of boxes, each one a 32 bit size followed by a 4 letter
// type. That is enough to walk down to the header holding the duration, without
// asking for ffprobe or for a dependency.
function findBox(buffer: Buffer, type: string, start: number, end: number): Box | undefined {
  let offset = start;

  while (offset + 8 <= end) {
    let size = buffer.readUInt32BE(offset);
    let headerSize = 8;

    if (size === 1) {
      // A size of 1 means the real, 64 bit, size follows the type.
      size = Number(buffer.readBigUInt64BE(offset + 8));
      headerSize = 16;
    } else if (size === 0) {
      // A size of 0 means the box runs until the end of the file.
      size = end - offset;
    }

    if (size < headerSize) {
      return undefined;
    }
    if (buffer.toString('ascii', offset + 4, offset + 8) === type) {
      return { start: offset + headerSize, end: offset + size };
    }
    offset += size;
  }

  return undefined;
}

function readDurationInSeconds(audioPath: string): number {
  const buffer = fs.readFileSync(audioPath);
  const moov = findBox(buffer, 'moov', 0, buffer.length);
  const mvhd = moov && findBox(buffer, 'mvhd', moov.start, moov.end);

  if (!mvhd) {
    throw new Error(`Could not read the duration of ${audioPath}. Is it an .m4a file?`);
  }

  // The header starts with one byte of version and three of flags.
  const version = buffer[mvhd.start];
  const fields = mvhd.start + 4;

  // Version 1 stores the creation and modification dates on 64 bits each.
  const timescale = version === 1 ? buffer.readUInt32BE(fields + 16) : buffer.readUInt32BE(fields + 8);
  const duration =
    version === 1 ? Number(buffer.readBigUInt64BE(fields + 20)) : buffer.readUInt32BE(fields + 12);

  if (!timescale) {
    throw new Error(`Could not read the duration of ${audioPath}: the timescale is zero.`);
  }

  return duration / timescale;
}

export function formatDuration(seconds: number): string {
  // Truncated, not rounded: a file of 105.8 seconds reads as 1:45 in a player,
  // and that is how the first hundred episodes were timed.
  const total = Math.floor(seconds);
  const minutes = Math.floor(total / 60) % 60;
  const hours = Math.floor(total / 3600);
  const pad = (value: number) => value.toString().padStart(2, '0');

  return hours ? `${hours}:${pad(minutes)}:${pad(total % 60)}` : `${pad(minutes)}:${pad(total % 60)}`;
}

export function findEpisodeFile(number: number): string {
  const prefix = `-${number.toString().padStart(3, '0')}-`;
  const matches = fs
    .readdirSync(POSTS_DIR)
    .filter((file) => file.endsWith('.md') && file.includes(prefix))
    .map((file) => path.join(POSTS_DIR, file));

  if (matches.length === 0) {
    throw new Error(`No episode found for #${number} in ${POSTS_DIR}.`);
  }
  if (matches.length > 1) {
    throw new Error(`Found more than one episode for #${number}: ${matches.join(', ')}`);
  }

  return matches[0];
}

export function attachAudio(episodePath: string, audioPath: string): AudioUpdate {
  if (!fs.existsSync(audioPath)) {
    throw new Error(`Audio file not found: ${audioPath}`);
  }

  const length = fs.statSync(audioPath).size;
  const duration = formatDuration(readDurationInSeconds(audioPath));
  const episode = fs.readFileSync(episodePath, 'utf8');

  const link = episode.match(/^podcast_link: *(\S+) *$/m);
  if (!link) {
    throw new Error(`Could not find podcast_link in ${episodePath}.`);
  }

  // The episode points at a URL, but what gets published is this file: when the
  // two names disagree the file on disk is the one telling the truth.
  const url = new URL(link[1]);
  const published = path.basename(audioPath);
  const renamed = path.basename(url.pathname) !== published;
  if (renamed) {
    url.pathname = path.posix.join(path.posix.dirname(url.pathname), published);
  }

  const updated = episode
    .replace(/^podcast_link: .*$/m, `podcast_link: ${url.toString()}`)
    .replace(/^podcast_duration: .*$/m, `podcast_duration: "${duration}"`)
    .replace(/^podcast_length: .*$/m, `podcast_length: ${length}`);

  fs.writeFileSync(episodePath, updated);

  return { length, duration, url: url.toString(), previousUrl: renamed ? link[1] : undefined };
}
