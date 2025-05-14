import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();

program
  .name('create-episode')
  .description('Generate a podcast episode markdown file')
  .version('1.0')
  .requiredOption('-p, --project <string>', 'Name of the project to spotlight')
  .requiredOption('-g, --guest <string>', 'Name of the guest')
  .requiredOption('-d, --date <string>', 'Release date of the episode')
  .requiredOption('-n, --number <number>', 'Number of the episode', parseInt);

program.parse(process.argv);

const options = program.opts();
const { project, guest, date, number } = options;

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

function generateMarkdown(): string {
  const id = toId(project);
  const guestId = toId(guest);
  const threeDigitNumber = number.toString().padStart(3, '0');

  return `---
title: "#${number} - ${project} with ${guest}"
excerpt: "TODO"
author_profile: true

description: "TODO"

header:
  teaser: "/assets/images/header-single-episode.png"
  overlay_image: "/assets/images/header-single-episode.png"
  show_overlay_excerpt: false
  overlay_filter: "0.6"
  og_image: "/assets/images/episodes/${number}-cover.png"

date: ${date}
permalink: /${number}/
redirect_from:
- /${number}/${id}/
- /${number}/${id}-with-${guestId}/

podcast_image: "/assets/images/episodes/${number}-cover.png"
podcast_episode_number: ${number}
podcast_link: https://dts.podtrac.com/redirect.m4a/hosting.thebakery.dev/${number}-thedevelopersbakery-${id}.m4a
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

  const id = toId(project);
  const threeDigitNumber = number.toString().padStart(3, '0');
  const filename = `../_posts/${date}-${threeDigitNumber}-${id}.md`;

  fs.writeFileSync(filename, generateMarkdown());
  
  info(`Podcast project title: ${project}`);
  info(`Podcast guest: ${guest}`);
  info(`Podcast date: ${date}`);
  info(`Podcast number: ${number}`);

  succ(`Episode created successfully: ${filename}`);
} catch (err) {
  error('Something went wrong creating the episode.', err as Error);
}