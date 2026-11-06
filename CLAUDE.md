# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The website + RSS feed for **The Developers' Bakery** podcast (https://thebakery.dev), a Jekyll 4 site with its own
layouts (no theme; see "Layouts and styling" below). Every podcast episode is a
Markdown post in `_posts/`; the same front matter powers both the HTML page and the iTunes/RSS feed.

## Commands

```bash
bundle install
bundle exec jekyll serve            # local dev — serves on http://127.0.0.1:4001 (port/host set in _config.yml)
bundle exec jekyll build            # production build into _site/
bundle exec jekyll build --drafts --unpublished --future   # what CI runs on PRs; use this to preview future-dated episodes
```

Episode tooling lives in `scripts/` (Node + TypeScript, run with `ts-node`). **These must be run from `scripts/`** —
they read and write paths relative to it (`../_posts/`, `assets/`):

```bash
cd scripts && yarn install
yarn create-episode -p "Story Name" -g "Guest Name" --github guesthandle -d 2026-11-20 -n 106   # Deep Dive (format: deep-dive)
yarn create-episode -t "Topic" -d 2026-11-20 -n 106                     # Fresh from the Oven (no guest)
yarn create-episode -t "Topic" -f special -d 2026-11-20 -n 106          # -f deep-dive | fresh-from-the-oven | special
yarn create-episode -t "Topic" -d 2026-11-20 -n 106 -a ep106.m4a        # -a also fills in the audio details
yarn attach-audio -n 100 -a ep100.m4a                   # fills podcast_length/duration on an existing episode
yarn create-artwork -n 100 -i guest-photo.jpg           # -> ../assets/images/episodes/100-{cover,og}.png
                                                        #    + ../assets/images/guests/100.png, linked as guests[0].photo
yarn create-artwork -n 100 -i https://host/photo.jpg    # -i also takes an http(s) URL
yarn create-artwork -n 100                              # no -i: guest slot left empty
yarn create-artwork -n 102 --host-episode               # Nicola, Marco and Paolo host stack
yarn create-artwork -n 100 --no-og                      # just the square cover
yarn create-artwork -n 100 --og-only --no-link          # just the wide one, without touching the post
yarn create-artwork -n 100 -i photo.jpg --no-guest-photo   # skip the website guest photo
yarn backfill-artwork --dry-run     # report the GitHub account each episode resolves to, write nothing
yarn backfill-artwork               # re-render every episode's og artwork from https://github.com/<user>.png
yarn convert-labels -i labels.txt   # Audacity label export (tab-separated) -> "- **MM.SS** Title" show-notes lines
```

Note: there are no tests and no linter. CI (`.github/workflows/`) only checks that Jekyll builds.

Local caveat: system Ruby here is 2.6 and the `bundler` version pinned in `Gemfile.lock` (2.6.8) is not installed, so
`bundle` fails out of the box. Use a modern Ruby (CI uses 3.4; Homebrew's Ruby 4.0 at `/opt/homebrew/bin/ruby` also
works) and `gem install --user-install bundler:2.6.8`, then run `bundle _2.6.8_ install` / `bundle _2.6.8_ exec ...`.
Ruby 4 may rewrite `Gemfile.lock` (extra platforms, a newer minitest); don't commit those incidental changes.

## Deployment

Push to `main` → `deploy-website.yaml` builds and pushes `_site/` to the `gh-pages` branch (GitHub Pages, custom
domain from `CNAME`). `.gitlab-ci.yml` is a legacy mirror of the same build and is not the active pipeline.

## Publishing a new episode

1. `yarn create-episode …` (see Commands): Deep Dive with `-p`/`-g`/`--github`, Fresh from the Oven with `-t`, a
   special with `-t … -f special`. Name the story in the title, not just the tool: `#106 - <story> with <Guest>`.
2. `yarn create-artwork -n N -i <guest photo>` for a Deep Dive, or `yarn create-artwork -n N --host-episode` for Fresh
   from the Oven. With `-i` it also writes the guest's round photo for the website and links it in the post.
3. `yarn attach-audio -n N -a <file>.m4a` (unless `create-episode -a` already did it), and upload the audio to
   `hosting.thebakery.dev` under the name `podcast_link` points at.
4. Fill in the post: `excerpt`, `description`, the show notes and chapters (`yarn convert-labels` turns an Audacity
   label export into the chapter lines), Resources. If there's a Recipe of the Week, uncomment `recipes:` and list the
   picks (keep them in the show notes too: the feed only carries the body).
5. Once Spotify has the episode, replace the commented show iframe at the top of the body with the episode's own
   embed and **uncomment it**: the feed description and the episode page's player both depend on it.
6. `bundle exec jekyll serve --future` and check `/`, `/N/` and `/episodes`; CI builds with
   `--drafts --unpublished --future`. Future-dated posts go live on their date (the deploy runs hourly).

## Episode architecture

An episode is `_posts/YYYY-MM-DD-NNN-project-slug.md` (NNN zero-padded to 3 digits). The front matter fields that
matter beyond normal Jekyll:

- `title` — **must** be `"#N - <something>"`, normally `"#N - Project with Guest"` (`"#00 - Show Trailer"` for
  episodes without a guest). The RSS template splits the title on `" - "` and publishes only the second half as the
  feed's `<title>`/`<itunes:title>`. Break the separator and every feed title breaks.
- `permalink: /N/` — the *unpadded* number is the canonical URL. `redirect_from` keeps older slug URLs alive
  (needs `jekyll-redirect-from`).
- `podcast_link` — the audio enclosure; a Podtrac redirect wrapping `hosting.thebakery.dev/N-thedevelopersbakery-<slug>.m4a`.
  Audio files are hosted externally, not in this repo.
- `podcast_duration` (`"MM:SS"`, truncated not rounded) and `podcast_length` (file size in **bytes**) — both feed
  enclosure metadata. `create-episode` scaffolds them as literal `TODO`; `attach-audio` derives both from the
  recorded file (it reads the MP4 `mvhd` atom directly, so no ffmpeg is needed) and rewrites `podcast_link` with a
  warning when the file on disk isn't named what the episode was pointing at.
- `podcast_image` — `assets/images/episodes/NN-cover.png`, the **square** 1200×1200 artwork. This one is the podcast
  artwork and feeds `<itunes:image>`, so it has to stay square; don't point it at the open graph file.
- `header.og_image` — `assets/images/episodes/NN-og.png`, the **wide** 1200×630 artwork, and the only thing
  `_includes/seo.html` turns into `og:image`/`twitter:image`. It has to be wide because the theme emits
  `twitter:card: summary_large_image`, and a square image there gets cropped to 2:1, which on the cover throws away
  the show name, the number and most of the guest photo.

  Both are generated by one `create-artwork` run, from `scripts/assets/episode-cover.svg` and
  `scripts/assets/episode-og.svg`. Neither SVG draws a background: Inkscape used to bake the page colour in on
  export, so the scripts read the template's own `pagecolor` (`#fed46d`) and hand it to resvg as the render
  backdrop, with the bundled Rubik Mono One TTF as the only font. Shared logic lives in `src/episode-artwork.ts`.

  The wide template additionally carries the episode title, which `create-artwork` reads back out of the post's
  `title` front matter (splitting on `" - "` then on the last `" with "`, matching the feed) unless `-p`/`-g`/`-t`
  override it. Because resvg cannot reflow text, the script wraps the title itself and picks the largest size that
  fits — measuring Rubik Mono One's advance from the font rather than assuming a ratio — into at most 3 title lines
  and 2 guest lines, then centres the block. After writing the PNG it points the post's `header.og_image` at it;
  `--no-link` skips that.

  `backfill-artwork` re-renders the wide artwork for every episode at once, taking the guest photo from
  `https://github.com/<user>.png`. It digs the account out of the show notes above the `# Show links` heading (that
  heading down is boilerplate on every episode), preferring `[@user on GitHub](…)`, then a bare profile URL, then a
  repository owner — and warns on each fallback, on multi-guest episodes where it had to pick one, and on episodes
  with no account at all. Episodes the notes get wrong are pinned by hand in its `OVERRIDES` map, which takes any
  URL or local path; add to it rather than editing the show notes to suit the script. It never touches the square
  covers, because those hold the real headshots and a GitHub avatar is not always the same photo.
- `excerpt` and `description` become `<itunes:subtitle>` and `<itunes:summary>`.

Season 2 fields, read only by the website (never by the feed):

- `format` — `deep-dive`, `fresh-from-the-oven` or `special`. Drives the stamp on tickets and episode pages and the
  filters on `/episodes`. Episodes **without** `format` are Season 1 (#0–#99); don't add it to them.
- `guests` — optional list of `{name, github, photo}`. The faces on the tickets and the "On the mic" card come from
  `photo` (local path or URL), else `https://github.com/<github>.png`, else the guest's initials. A `github` that matches
  a host in `_data/hosts.yml` uses the host's local photo. `create-artwork -i` writes
  `assets/images/guests/NN.png` (160px, the cover's guest image cropped the same way) and links it; #101, #103 and #105
  use hand-made face crops of their covers (`NNN.jpg`). Replace either when a better photo turns up. Fresh from the Oven episodes always show the three hosts.
  Season 1 guests live in `_data/season1_guests.yml` instead (keyed by episode number, generated once from
  `yarn backfill-artwork --dry-run`); single-guest episodes point `photo` at `assets/images/guests/NN.jpg`, a 160px
  crop of the guest slot of their square cover, and multi-guest ones use GitHub avatars. Edit that file to fix a
  Season 1 face.
- `byline` — optional override for the line under the title on tickets (default: "with <guests>", or
  "Nicola, Marco & Paolo" for Fresh from the Oven), e.g. `"Nicola in the guest chair"`.
- `recipes` — optional Recipe of the Week picks `{host, name, url, what}` (`host` is a GitHub id from
  `_data/hosts.yml`). Rendered as cards on the episode page and as the latest picks on the homepage. Keep the picks in
  the show notes too: the feed only carries the body.

`create-episode` scaffolds `format` (`-f`, defaults to `deep-dive` with `-g`, else `fresh-from-the-oven`), the
`guests` entry (`--github` for the handle) and a commented `recipes` example.

**The post body must open with the Spotify `<iframe>`.** `_pages/podcast.xml` builds `<description>` and
`<content:encoded>` from `content | split: "</iframe>"` and takes index `[1]`, so a post without that iframe ships an
empty feed description. `create-episode` emits the iframe commented out — uncomment it when publishing.

The feed itself is `_pages/podcast.xml` (`permalink: /podcast`), driven entirely by `site.posts` plus the
`podcast_*` show-level settings at the bottom of `_config.yml`.

## Layouts and styling

There is no theme: everything that renders the site is in this repo.

- `_layouts/default.html` — `<head>` (`_includes/seo.html` for meta/og/twitter tags, Google Fonts, `{% feed_meta %}`),
  the nav (from `_data/navigation.yml`), footer and `assets/js/site.js`. The `<body>` gets `page-<body_class>`, which
  page-specific CSS is scoped by. Font Awesome is loaded on episode pages only, for the icons inside old show notes.
- `_layouts/home.html` (used by `index.html`), `_layouts/episode.html` (every post, via `defaults` in `_config.yml`),
  `_layouts/page.html` (plain Markdown pages like the 404). `/episodes`, `/about` and `/guest` are HTML pages in
  `_pages/` on top of `default`.
- `_layouts/episode.html` splits the post body: everything up to the first `</iframe>` becomes the player section, the
  rest the show notes. It drops the `# Show links` section (boilerplate) and inserts the `recipes` cards before
  `# Resources`. A "Chapters"/"Show Notes" list of `**MM.SS** Title` items becomes clickable chapters that seek the
  Spotify player (Spotify iFrame API) when the embed is an episode embed.
- Includes: `episode-vars.html` (derives number, format, stamp, short title, guests and byline from a post — use it
  rather than re-parsing titles), `ticket.html`, `people.html`, `avatar.html`, `guest-band.html` (the "N episodes and
  counting" number is computed from `site.posts`), `logo.svg`, `seo.html`.
- `_data/hosts.yml` — the three hosts (bios, photos in `assets/images/hosts/`, links).
- `assets/css/main.scss` — the one stylesheet. Tokens and shared components (nav, buttons, stamps, avatars, the cooling
  rack and tickets) at the top, then one block per page. Palette: butter `#FED46D`, ink `#45423D`, dough `#F0D6AB`,
  flour `#FFF9EC`, crust `#B8561E` (stamps/accents only), rack `#2F2D2A`, steel `#8F8A80`, Season 1 `#8A7A5C`. Fonts:
  Rubik Mono One (display), Rubik (body), JetBrains Mono (utility). It is compiled by libsass, which evaluates `min()`
  and `max()` itself: wrap CSS ones as `#{'min(...)'}`.
- `assets/js/site.js` — rack arrows and drag, archive filters and search (`?f=` / `?q=` in the URL), chapters,
  copy-link. The site works without it.

Plugins (all must be in the `Gemfile`, since CI runs `bundle exec jekyll build`): `jekyll-redirect-from` (old slugs,
`/contact` → `/guest`, the old `/pageN/`, `/tags/` and `/categories/` URLs → `/episodes`), `jekyll-sitemap`,
`jekyll-feed` (`/feed.xml`), `jemoji`. Standalone pages live in `_pages/` and each declares its own `permalink`.
