import { Command } from 'commander';
import * as fs from 'fs';
import {
  COVER_TEMPLATE,
  CoverImage,
  EpisodeTitle,
  OG_TEMPLATE,
  artworkPath,
  artworkUrl,
  episodeId,
  linkOgImage,
  loadImage,
  readEpisodeTitle,
  renderCover,
  renderOg,
} from './episode-artwork';

const program = new Command();

program
  .name('create-artwork')
  .description('Generate the cover and the open graph artwork of a podcast episode')
  .version('1.0')
  .requiredOption('-n, --number <number>', 'Number of the episode', parseInt)
  .option('-i, --image <string>', 'Image to place in the guest slot, a path or an http(s) URL, omit to leave it empty')
  .option('-p, --project <string>', 'Project of the episode, defaults to the title of the episode post')
  .option('-g, --guest <string>', 'Guest of the episode, defaults to the title of the episode post')
  .option('-t, --title <string>', 'Title of the episode, as an alternative to --project and --guest')
  .option('--no-og', 'Only render the square cover')
  .option('--og-only', 'Only render the open graph artwork')
  .option('--no-link', 'Do not point the episode post at the open graph artwork')
  .option('-o, --output <string>', 'Where to write the cover PNG, defaults to the episodes folder');

program.parse(process.argv);

const options = program.opts();
const { number, image, project, guest, title, og, ogOnly, link, output } = options;

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

// The episode post is the single source of truth for the title, so that the
// artwork and the feed can never disagree. The flags are there for the artwork
// of an episode that has not been written yet.
function resolveTitle(): EpisodeTitle {
  if (title) {
    if (project || guest) {
      error('Pass either --title or both --project and --guest, not both.');
    }
    return { title };
  }

  if (project || guest) {
    if (!project || !guest) {
      error('Pass either --title or both --project and --guest.');
    }
    return { title: project, guest };
  }

  return readEpisodeTitle(number);
}

async function main() {
  try {
    info('🎨🎨🎨 create-artwork 🎨🎨🎨');
    info('Welcome to create-artwork', '👋');
    info('Creating your artwork...');

    if (ogOnly && !og) {
      error('Pass either --og-only or --no-og, not both.');
    }

    const wantsCover = !ogOnly;
    const wantsOg = og;

    for (const template of [wantsCover ? COVER_TEMPLATE : undefined, wantsOg ? OG_TEMPLATE : undefined]) {
      if (template && !fs.existsSync(template)) {
        error(`Template not found: ${template}. Run this script from the scripts/ folder.`);
      }
    }

    if (image) {
      info(`Loading ${image}...`, '🌍');
    }
    const cover: CoverImage | undefined = image ? await loadImage(image) : undefined;
    if (!cover) {
      warn('No image provided, the guest slot will be left empty.');
    }

    if (wantsCover) {
      const target = output ?? artworkPath(number, 'cover');
      fs.writeFileSync(target, renderCover(COVER_TEMPLATE, number, cover));
      info(`Cover: ${target} (1200x1200)`);
    }

    if (wantsOg) {
      const episode = resolveTitle();
      const { png, layout } = renderOg(OG_TEMPLATE, number, episode, cover);
      const target = artworkPath(number, 'og');
      fs.writeFileSync(target, png);

      info(`Open graph: ${target} (1200x630)`);
      info(`Title: ${episode.title} (${layout.title.size}px over ${layout.title.lines.length} line(s))`);
      if (episode.guest) {
        info(`Guest: ${episode.guest} (${layout.guest?.size}px over ${layout.guest?.lines.length} line(s))`);
      } else {
        warn('The episode has no guest, so the artwork shows the title alone.');
      }

      if (link) {
        const { episodePath } = linkOgImage(number);
        info(`Linked ${episodePath} to ${artworkUrl(number, 'og')}`);
      }
    }

    info(`Episode number: #${episodeId(number)}`);
    info(`Cover image: ${image ?? 'none'}`);

    succ(`Artwork created successfully for episode #${episodeId(number)}`);
  } catch (err) {
    error('Something went wrong creating the artwork.', err as Error);
  }
}

main();
