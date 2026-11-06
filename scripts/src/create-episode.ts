import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import { attachAudio } from './episode-audio';

// Episodes are published at noon UTC. A date without a time becomes midnight in
// the timezone of the site, which reads as the day before for every listener
// west of London: noon is the hour that shows the same date almost everywhere.
const PUBLISH_TIME = '12:00:00 +0000';
// Season 2 formats; they drive the stamp on the site and the archive filters. Season 1 posts have none.
const FORMATS = ['deep-dive', 'fresh-from-the-oven', 'special'];

const program = new Command();

program
  .name('create-episode')
  .description('Generate a podcast episode markdown file')
  .version('1.0')
  .option('-p, --project <string>', 'Name of the project to spotlight (requires --guest)')
  .option('-g, --guest <string>', 'Name of the guest (requires --project)')
  .option('-t, --title <string>', 'Title of the episode, as an alternative to --project and --guest')
  .option('-s, --slug <string>', 'Slug of the episode, defaults to the project name or to the title')
  .option('-a, --audio <string>', 'Path to the audio file, to fill in the duration and the length right away')
  .option(
    '-f, --format <string>',
    `Episode format: ${FORMATS.join(', ')}. Defaults to deep-dive with --guest, fresh-from-the-oven otherwise`,
  )
  .option('--github <string>', "The guest's GitHub handle, for their photo on the episode tickets")
  .requiredOption('-d, --date <string>', 'Release date of the episode')
  .requiredOption('-n, --number <number>', 'Number of the episode', parseInt);

program.parse(process.argv);

const options = program.opts();
const { project, guest, title, slug: customSlug, audio, date, number, github } = options;
const format: string = options.format ?? (guest ? 'deep-dive' : 'fresh-from-the-oven');

function toId(str: string): string {
  return str.toLowerCase().replace(/\s+/g, '-');
}

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

interface Episode {
  displayTitle: string;
  slug: string;
  redirects: string[];
}

// An episode is described either by a project and its guest, or by a plain title.
function resolveEpisode(): Episode {
  if (!FORMATS.includes(format)) {
    error(`Unknown --format "${format}". Use one of: ${FORMATS.join(', ')}.`);
  }
  if (github && !guest) {
    error('--github is the guest\'s handle, so it needs --guest too.');
  }
  if (title) {
    if (project || guest) {
      error('Pass either --title or both --project and --guest, not both.');
    }
    const slug = toId(customSlug ?? title);
    return { displayTitle: title, slug, redirects: [`/${number}/${slug}/`] };
  }

  if (!project || !guest) {
    error('Pass either --title or both --project and --guest.');
  }

  const slug = toId(customSlug ?? project);
  return {
    displayTitle: `${project} with ${guest}`,
    slug,
    redirects: [`/${number}/${slug}/`, `/${number}/${slug}-with-${toId(guest)}/`],
  };
}

// The `guests:` list the site reads for the faces on tickets and the "On the mic" card.
function guestsBlock(): string {
  if (!guest) return '';
  return `guests:\n  - name: "${guest}"\n    github: ${github ?? 'TODO'}\n`;
}

function generateMarkdown(episode: Episode): string {
  const { displayTitle, slug, redirects } = episode;
  // The artwork is named with a two digit number, the way create-artwork writes
  // it: episode 5 is 05-cover.png, not 5-cover.png.
  const artworkId = number.toString().padStart(2, '0');

  return `---
title: "#${number} - ${displayTitle}"
excerpt: "TODO"
description: "TODO"

format: ${format}
${guestsBlock()}# Recipe of the Week picks, shown as cards on the episode page and on the homepage. host is a GitHub handle from _data/hosts.yml.
# recipes:
#   - host: cortinico
#     name: "TODO"
#     url: "https://TODO"
#     what: "One line on what it does."

header:
  og_image: "/assets/images/episodes/${artworkId}-og.png"

date: ${date} ${PUBLISH_TIME}
permalink: /${number}/
redirect_from:
${redirects.map((redirect) => `- ${redirect}`).join('\n')}

podcast_image: "/assets/images/episodes/${artworkId}-cover.png"
podcast_episode_number: ${number}
podcast_link: https://dts.podtrac.com/redirect.m4a/hosting.thebakery.dev/${number}-thedevelopersbakery-${slug}.m4a
podcast_duration: "TODO"
podcast_length: TODO
---

<!-- <iframe src="https://open.spotify.com/embed-podcast/show/4jV6Yoz7D38sZJlYMzJm3k" width="100%" height="232" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe> -->

Enjoy the show 👨‍🍳

# Chapters

- **00.00** Intro

# Resources

* Mentioned Resources:
    * <i class="fas fa-link"></i> [A website](https://ncorti.com/)

# Hosts

* Nicola: <i class="fab fa-github"></i> [@cortinico on GitHub](https://github.com/cortinico) · <i class="fab fa-x-twitter"></i> [@cortinico on X](https://x.com/cortinico)
* Marco: <i class="fab fa-github"></i> [@prof18 on GitHub](https://github.com/prof18) · <i class="fab fa-x-twitter"></i> [@marcoGomier on X](https://x.com/marcoGomier)
* Paolo: <i class="fab fa-github"></i> [@paolorotolo on GitHub](https://github.com/paolorotolo) · <i class="fab fa-x-twitter"></i> [@paolorotolo on X](https://x.com/paolorotolo)

# Show links

* <i class="fas fa-link"></i> [Podcast Website](https://thebakery.dev)
* <i class="fab fa-spotify"></i> [The Developers' Bakery on Spotify](https://open.spotify.com/show/4jV6Yoz7D38sZJlYMzJm3k)
* <i class="fas fa-podcast"></i> [The Developers' Bakery on Apple Podcasts](https://podcasts.apple.com/us/podcast/the-developers-bakery/id1542849034)
* <i class="fab fa-x-twitter"></i> [@thebakerydev on X](https://x.com/thebakerydev)
* Want to be a guest? [thebakery.dev/guest](https://thebakery.dev/guest)
`;
}

try {
  info("🖋🖋🖋 create-episode ✒️✒️✒️️️️");
  info("Welcome to create-episode", "👋");
  info("Creating your episode...");

  const episode = resolveEpisode();
  const threeDigitNumber = number.toString().padStart(3, '0');
  const filename = `../_posts/${date}-${threeDigitNumber}-${episode.slug}.md`;

  fs.writeFileSync(filename, generateMarkdown(episode));

  info(`Podcast title: ${episode.displayTitle}`);
  info(`Podcast date: ${date}`);
  info(`Podcast number: ${number}`);

  if (audio) {
    const update = attachAudio(filename, audio);
    if (update.previousUrl) {
      warn(`The audio file is named ${path.basename(audio)}, so the URL now points at it.`);
    }
    info(`Podcast duration: ${update.duration}`);
    info(`Podcast length: ${update.length} bytes`);
  }

  succ(`Episode created successfully: ${filename}`);
} catch (err) {
  error('Something went wrong creating the episode.', err as Error);
}