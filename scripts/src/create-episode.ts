import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';

// Episodes are published at noon UTC. A date without a time becomes midnight in
// the timezone of the site, which reads as the day before for every listener
// west of London: noon is the hour that shows the same date almost everywhere.
const PUBLISH_TIME = '12:00:00 +0000';

const program = new Command();

program
  .name('create-episode')
  .description('Generate a podcast episode markdown file')
  .version('1.0')
  .option('-p, --project <string>', 'Name of the project to spotlight (requires --guest)')
  .option('-g, --guest <string>', 'Name of the guest (requires --project)')
  .option('-t, --title <string>', 'Title of the episode, as an alternative to --project and --guest')
  .option('-s, --slug <string>', 'Slug of the episode, defaults to the project name or to the title')
  .requiredOption('-d, --date <string>', 'Release date of the episode')
  .requiredOption('-n, --number <number>', 'Number of the episode', parseInt);

program.parse(process.argv);

const options = program.opts();
const { project, guest, title, slug: customSlug, date, number } = options;

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

function generateMarkdown(episode: Episode): string {
  const { displayTitle, slug, redirects } = episode;

  return `---
title: "#${number} - ${displayTitle}"
excerpt: "TODO"
author_profile: true

description: "TODO"

header:
  teaser: "/assets/images/header-single-episode.png"
  overlay_image: "/assets/images/header-single-episode.png"
  show_overlay_excerpt: false
  overlay_filter: "0.6"
  og_image: "/assets/images/episodes/${number}-cover.png"

date: ${date} ${PUBLISH_TIME}
permalink: /${number}/
redirect_from:
${redirects.map((redirect) => `- ${redirect}`).join('\n')}

podcast_image: "/assets/images/episodes/${number}-cover.png"
podcast_episode_number: ${number}
podcast_link: https://dts.podtrac.com/redirect.m4a/hosting.thebakery.dev/${number}-thedevelopersbakery-${slug}.m4a
podcast_duration: "TODO"
podcast_length: TODO
---

<!-- <iframe src="https://open.spotify.com/embed-podcast/show/4jV6Yoz7D38sZJlYMzJm3k" width="100%" height="232" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe> -->

Enjoy the show 👨‍🍳

# Show Notes

- **00.00** Intro

# Resources

* <i class="fab fa-github"></i> [cortinico/thebakery on GitHub](https://github.com/cortinico/thebakery)
* <i class="fas fa-link"></i> [TheBakery Official Website](https://thebakery.dev/)
* Mentioned Resources:
    * <i class="fas fa-link"></i> [A website](https://ncorti.com/)
* <i class="fab fa-github"></i> [@cortinico on GitHub](https://github.com/cortinico)
* <i class="fab fa-twitter"></i> [@cortinico on Twitter](https://twitter.com/cortinico)

# Show links

* <i class="fas fa-link"></i> [Podcast Website](https://thebakery.dev)
* <i class="fab fa-spotify"></i> [The Developers' Bakery on Spotify](https://open.spotify.com/show/4jV6Yoz7D38sZJlYMzJm3k?si=AL3ske_0R_CKlEScMhYhug)
* <i class="fas fa-podcast"></i> [The Developers' Bakery on Apple Podcasts](https://podcasts.apple.com/us/podcast/the-developers-bakery/id1542849034)
* <i class="fab fa-google-play"></i> [The Developers' Bakery on Google Podcasts](https://podcasts.google.com/feed/aHR0cHM6Ly90aGViYWtlcnkuZGV2L3BvZGNhc3QueG1s)
* <i class="fab fa-twitter"></i> [@thebakerydev on Twitter](https://twitter.com/thebakerydev)
* <i class="fab fa-twitter"></i> [@cortinico on Twitter](https://twitter.com/cortinico)
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

  succ(`Episode created successfully: ${filename}`);
} catch (err) {
  error('Something went wrong creating the episode.', err as Error);
}