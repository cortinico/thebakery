---
title: "#102 - Difftray and the agentic code review loop"
excerpt: "Review agent-written code, tracks changes across iterations, and keeps his development workflow moving from anywhere with DiffTray"
author_profile: true

description: "Marco Gomiero takes us through his agentic development setup and Difftray, the local-first review app he built to track changing diffs, send feedback to coding agents, and review code remotely."

header:
  teaser: "/assets/images/header-single-episode.png"
  overlay_image: "/assets/images/header-single-episode.png"
  show_overlay_excerpt: false
  overlay_filter: "0.6"
  og_image: "/assets/images/episodes/102-og.png"

date: 2026-09-24 12:00:00 +0000
permalink: /102/
redirect_from:
- /102/reviewing-agent-written-code-with-difftray/

podcast_image: "/assets/images/episodes/102-cover.png"
podcast_episode_number: 102
podcast_link: https://dts.podtrac.com/redirect.m4a/hosting.thebakery.dev/102-thedevelopersbakery-difftray.m4a
podcast_duration: "49:29"
podcast_length: 20012902
---

<iframe src="https://open.spotify.com/embed-podcast/show/4jV6Yoz7D38sZJlYMzJm3k" width="100%" height="232" frameborder="0" allowtransparency="true" allow="encrypted-media"></iframe>

When coding agents can produce changes faster than you can inspect them, what does a useful code review look like?

In this _Fresh from the Oven_ episode, [**Marco**](https://www.marcogomiero.com) walks us through his agentic development setup. He explains how he reviews plans and architecture before implementation, how he uses fresh contexts and different models to review generated code, and why the signals he looks for are changing as code becomes a commodity.

The core of the conversation is [**Difftray**](https://difftray.app/), Marco's local-first review desk for Git changes. Marco built it after repeatedly losing track of files that an agent had changed after his first pass.

Difftray remembers which files were reviewed, flags them when their diffs drift, and turns inline review comments into a prompt that can be sent back to the agent.

We also explore Marco's remote workflow: HTML plans in Obsidian, Codex and Claude Code running on his Mac Studio, Difftray Companion on his phone, Tailscale for private remote access, and plenty of Git worktrees for parallel agents. 

Enjoy the show 👨‍🍳

# Show Notes

- **00.00** Intro
- **00.59** Episode Start
- **01.43** Do we still review agent-written code?
- **06.01** From prompt to code review
- **09.08** Marco's models and coding agents
- **11.27** Planning with agents
- **15.36** Why Marco built Difftray
- **20.04** Turning review comments into prompts
- **24.42** Reviewing code from a phone
- **28.36** Marco's remote agentic setup
- **32.03** Parallel agents and Git worktrees
- **34.41** Bringing agent reviews into Difftray
- **36.43** Do developers still need an IDE?
- **42.06** FOSDEM 2027
- **44.26** Recipe of the Week
- **48.44** Closing

# Resources

* <i class="fas fa-link"></i> [Difftray](https://difftray.app/) - Marco's local-first review desk for Git changes
* <i class="fab fa-github"></i> [Difftray on GitHub](https://github.com/prof18/difftray)
* <i class="fab fa-github"></i> [HTML Shelf on GitHub](https://github.com/prof18/html-shelf) - Marco's Obsidian plugin for browsing HTML plans on desktop and mobile
* <i class="fas fa-link"></i> [Obsidian](https://obsidian.md/)
* <i class="fas fa-link"></i> [Tailscale](https://tailscale.com/)
* <i class="fas fa-link"></i> [OpenCode](https://opencode.ai/)
* <i class="fas fa-link"></i> [FOSDEM 2027](https://fosdem.org/2027/)
* Recipe of the Week:
    * Marco: <i class="fab fa-github"></i> [Archify](https://github.com/tt-a1i/archify)
    * Nicola: <i class="fas fa-link"></i> [Zencastr](https://zencastr.com/home)
    * Paolo: <i class="fas fa-link"></i> [GitHub stacked pull requests](https://docs.github.com/en/pull-requests/how-tos/stacked-pull-requests)

Marco:

* <i class="fab fa-github"></i> [@prof18 on GitHub](https://github.com/prof18)
* <i class="fab fa-x-twitter"></i> [@marcoGomier on X](https://x.com/marcoGomier)

Paolo:

* <i class="fab fa-github"></i> [@paolorotolo on GitHub](https://github.com/paolorotolo)
* <i class="fab fa-x-twitter"></i> [@paolorotolo on X](https://x.com/paolorotolo)

Nicola:

* <i class="fab fa-github"></i> [@cortinico on GitHub](https://github.com/cortinico)
* <i class="fab fa-x-twitter"></i> [@cortinico on X](https://x.com/cortinico)

# Show links

* <i class="fas fa-link"></i> [Podcast Website](https://thebakery.dev)
* <i class="fab fa-spotify"></i> [The Developers' Bakery on Spotify](https://open.spotify.com/show/4jV6Yoz7D38sZJlYMzJm3k?si=AL3ske_0R_CKlEScMhYhug)
* <i class="fas fa-podcast"></i> [The Developers' Bakery on Apple Podcasts](https://podcasts.apple.com/us/podcast/the-developers-bakery/id1542849034)
* <i class="fab fa-google-play"></i> [The Developers' Bakery on Google Podcasts](https://podcasts.google.com/feed/aHR0cHM6Ly90aGViYWtlcnkuZGV2L3BvZGNhc3QueG1s)
* <i class="fab fa-x-twitter"></i> [@thebakerydev on X](https://x.com/thebakerydev)
