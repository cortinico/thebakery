import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { POSTS_DIR } from './episode-audio';
import {
  OG_TEMPLATE,
  artworkPath,
  artworkUrl,
  episodeId,
  linkOgImage,
  loadImage,
  readEpisodeTitle,
  renderOg,
} from './episode-artwork';

// The show's own accounts turn up in every set of show notes, so they can never
// be the guest.
const HOST_ACCOUNTS = new Set(['cortinico', 'thebakery', 'thebakerydev']);

// Everything from this heading down is the same boilerplate on every episode.
const BOILERPLATE = /^# Show links/m;

const GITHUB_LINK = /\[@([A-Za-z0-9_.-]+) on GitHub\]\(https:\/\/github\.com\/([A-Za-z0-9_.-]+)\/?\)/g;
const GITHUB_URL = /https:\/\/github\.com\/([A-Za-z0-9_.-]+)(\/[A-Za-z0-9_.-]+)?/g;

// Episodes whose guest the show notes cannot identify, pinned by hand. The
// value is anything loadImage takes: an http(s) URL, or a path relative to the
// scripts folder. GitHub serves the avatar from the profile URL plus ".png".
const OVERRIDES: Record<number, string> = {
  // The trailer has no guest, so it carries the host. Pinning it here also
  // sidesteps HOST_ACCOUNTS, which the resolver would otherwise filter out.
  0: 'https://github.com/cortinico.png',
  // The notes link the coil-kt organisation rather than Coil's author.
  2: 'https://github.com/colinrtwhite.png',
  // The account the notes point at was renamed and the old one now 404s.
  8: 'https://github.com/pepicrft.png',
  // The show notes link nothing on GitHub.
  20: 'https://github.com/kikoso.png',
  // Three guests, so the episode carries the project rather than one of them.
  30: 'https://github.com/detekt.png',
  // The episode is about the site itself, so it uses the show's own icon.
  40: '../assets/images/icon-about.png',
  // The notes link the teaxyz and pkgxdev organisations, not tea's author.
  73: 'https://github.com/mxcl.png',
};

type Source = 'override' | 'profile-link' | 'profile-url' | 'repo-owner' | 'none';

interface Resolution {
  number: number;
  episodePath: string;
  user?: string;
  source: Source;
  // What the guest slot is filled from, ready to hand to loadImage.
  image?: string;
  // Everything that looked like a candidate, so a wrong pick is easy to spot.
  candidates: string[];
  hasGuest: boolean;
}

const program = new Command();

program
  .name('backfill-artwork')
  .description('Generate the open graph artwork of every published episode')
  .version('1.0')
  .option('-d, --dry-run', 'Only report which GitHub account each episode resolves to')
  .option('-n, --number <number>', 'Only handle one episode', parseInt)
  .option('--no-link', 'Do not point the episode posts at their artwork');

program.parse(process.argv);

const options = program.opts();
const { dryRun, number, link } = options;

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

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function isHost(user: string): boolean {
  return HOST_ACCOUNTS.has(user.toLowerCase());
}

// The guest's account, in descending order of how much the shape of the link
// says it belongs to a person rather than to a project.
function findGithubUser(notes: string): Pick<Resolution, 'user' | 'source' | 'candidates'> {
  // "[@kaeawc on GitHub](https://github.com/kaeawc)" is unambiguous.
  const tagged = unique(
    [...notes.matchAll(GITHUB_LINK)].map((match) => match[2]).filter((user) => !isHost(user)),
  );
  if (tagged.length) {
    return { user: tagged[0], source: 'profile-link', candidates: tagged };
  }

  const urls = [...notes.matchAll(GITHUB_URL)];

  // A bare profile URL is still a person.
  const profiles = unique(urls.filter((match) => !match[2]).map((match) => match[1]).filter((user) => !isHost(user)));
  if (profiles.length) {
    return { user: profiles[0], source: 'profile-url', candidates: profiles };
  }

  // The owner of a repository is a last resort: half of them are organisations,
  // whose avatar is a logo rather than a face.
  const owners = unique(urls.filter((match) => match[2]).map((match) => match[1]).filter((user) => !isHost(user)));
  if (owners.length) {
    return { user: owners[0], source: 'repo-owner', candidates: owners };
  }

  return { source: 'none', candidates: [] };
}

function episodeNumber(file: string): number | undefined {
  const match = file.match(/^\d{4}-\d{2}-\d{2}-(\d{3})-/);
  return match ? parseInt(match[1], 10) : undefined;
}

function resolveAll(): Resolution[] {
  const resolutions: Resolution[] = [];

  for (const file of fs.readdirSync(POSTS_DIR).sort()) {
    if (!file.endsWith('.md')) {
      continue;
    }

    const parsed = episodeNumber(file);
    if (parsed === undefined) {
      warn(`Skipping ${file}: the filename carries no episode number.`);
      continue;
    }
    if (number !== undefined && parsed !== number) {
      continue;
    }

    const episodePath = path.join(POSTS_DIR, file);
    const episode = fs.readFileSync(episodePath, 'utf8');
    const cut = episode.search(BOILERPLATE);
    const notes = cut === -1 ? episode : episode.slice(0, cut);

    const pinned = OVERRIDES[parsed];
    const found = pinned
      ? { source: 'override' as Source, candidates: [], image: pinned }
      : ((resolved) => ({ ...resolved, image: resolved.user && `https://github.com/${resolved.user}.png` }))(
          findGithubUser(notes),
        );

    resolutions.push({
      number: parsed,
      episodePath,
      hasGuest: readEpisodeTitle(parsed).guest !== undefined,
      ...found,
    });
  }

  return resolutions;
}

function report(resolution: Resolution) {
  const { number: n, source, user, image, candidates, hasGuest } = resolution;
  const label = `#${episodeId(n)}`;

  if (source === 'override') {
    info(`${label} -> ${image} (pinned)`);
    return;
  }

  if (source === 'none') {
    // An episode with no guest is not supposed to have a photo.
    if (hasGuest) {
      warn(`${label} no GitHub account in the show notes, the guest slot will be empty.`);
    } else {
      info(`${label} has no guest, the guest slot is left empty.`);
    }
    return;
  }

  if (source === 'repo-owner') {
    warn(`${label} fell back to the repository owner "${user}", which may be an organisation, not the guest.`);
    return;
  }

  if (candidates.length > 1) {
    warn(`${label} has ${candidates.length} accounts (${candidates.join(', ')}), picked "${user}".`);
    return;
  }

  info(`${label} -> ${user}`);
}

async function main() {
  try {
    info('🖼🖼🖼 backfill-artwork 🖼🖼🖼');
    info('Welcome to backfill-artwork', '👋');

    if (!fs.existsSync(OG_TEMPLATE)) {
      error(`Template not found: ${OG_TEMPLATE}. Run this script from the scripts/ folder.`);
    }

    const resolutions = resolveAll();
    if (!resolutions.length) {
      error(number === undefined ? `No episodes found in ${POSTS_DIR}.` : `No episode found for #${number}.`);
    }

    info(`Resolving the guest of ${resolutions.length} episode(s)...`);
    resolutions.forEach(report);

    if (dryRun) {
      succ('Dry run, nothing was written.');
      return;
    }

    // Only the wide artwork is (re)generated. The square covers already carry
    // the real headshots, and a GitHub avatar is not always the same photo.
    info('Rendering the open graph artwork, the square covers are left alone...');

    const failed: number[] = [];

    for (const resolution of resolutions) {
      const { number: n, image } = resolution;
      const label = `#${episodeId(n)}`;

      try {
        const cover = image ? await loadImage(image) : undefined;
        const episode = readEpisodeTitle(n);
        const { png, layout } = renderOg(OG_TEMPLATE, n, episode, cover);

        if (!layout.fits) {
          warn(`${label} the title does not fit even at the smallest size, it will overlap the rest.`);
        }

        fs.writeFileSync(artworkPath(n, 'og'), png);

        if (link) {
          linkOgImage(n);
        }
      } catch (err) {
        failed.push(n);
        warn(`${label} failed: ${(err as Error).message}`);
      }
    }

    const written = resolutions.length - failed.length;
    info(`Written: ${written} artwork(s) into ${path.dirname(artworkPath(0, 'og'))}`);
    if (link) {
      info(`Linked: ${written} episode(s) to their ${artworkUrl(0, 'og').replace('00-og', 'NN-og')}`);
    }

    if (failed.length) {
      warn(`Failed for ${failed.length} episode(s): ${failed.map((n) => `#${episodeId(n)}`).join(', ')}`);
      warn('Re-run those with create-artwork once you know the right image.');
    }

    succ(`Backfilled ${written} of ${resolutions.length} episode(s)`);
  } catch (err) {
    error('Something went wrong backfilling the artwork.', err as Error);
  }
}

main();
