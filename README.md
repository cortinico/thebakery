# The Developers' Bakery - Podcast website

[![License](https://img.shields.io/badge/License-Apache%202.0-blue)](https://opensource.org/licenses/Apache-2.0) [![X](https://img.shields.io/badge/X-@thebakerydev-blue.svg?style=flat)](https://x.com/thebakerydev) [![powered by Jekyll](https://img.shields.io/badge/powered_by-Jekyll-red.svg)](https://jekyllrb.com/)

🌐 [thebakery.dev](https://thebakery.dev)

Do you want to support this podcast? ☕ [buymeacoffee.com/cortinico](https://buymeacoffee.com/cortinico)

<p align="center">
    <img src="https://i.imgur.com/k7HDp50.png">
</p>

Listen on:
* <i class="fab fa-spotify"></i> [Listen on Spotify](https://open.spotify.com/show/4jV6Yoz7D38sZJlYMzJm3k?si=AL3ske_0R_CKlEScMhYhug)
* <i class="fas fa-podcast"></i> [Listen on Apple Podcasts](https://podcasts.apple.com/us/podcast/the-developers-bakery/id1542849034)

The site is a plain Jekyll build with its own layouts (no theme), deployed to GitHub Pages.

## Publishing a new episode

From `scripts/` (`yarn install` once):

1. `yarn create-episode -p "Story" -g "Guest Name" --github handle -d YYYY-MM-DD -n N` for a Deep Dive, or
   `yarn create-episode -t "Topic" -d YYYY-MM-DD -n N` for Fresh from the Oven (`-f special` for specials).
2. `yarn create-artwork -n N -i guest-photo.jpg` (Deep Dive) or `yarn create-artwork -n N --host-episode`.
3. `yarn attach-audio -n N -a episode.m4a`, and upload the audio.
4. Fill in the post (excerpt, description, notes, chapters, optional `recipes:`), then swap in the episode's Spotify
   embed and uncomment it.
5. Preview with `bundle exec jekyll serve --future`.

The full details, including every front matter field, are in [CLAUDE.md](CLAUDE.md).
