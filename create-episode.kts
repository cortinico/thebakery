#!/usr/bin/env kscript
@file:DependsOn("info.picocli:picocli:4.3.2")

import picocli.CommandLine
import picocli.CommandLine.Command
import picocli.CommandLine.Option
import picocli.CommandLine.Parameters
import java.io.File
import java.nio.file.*
import java.util.concurrent.Callable
import java.time.*
import java.time.format.*
import java.util.concurrent.*

@Command(name = "create-episode", mixinStandardHelpOptions = true, version = ["1.0"])
class GenerateSnippets : Callable<Int> {

    @Option(names = ["-p", "--project"], required = true, description = ["Name of the project to spotlight"])
    private var project: String = ""

    @Option(names = ["-g", "--guest"], required = true, description = ["Name of the guest"])
    private var guest: String = ""

    @Option(names = ["-d", "--date"], required = true, description = ["Release date of the episode"])
    private var date: String = ""

    @Option(names = ["-n", "--number"], required = true, description = ["Number of the episode"])
    private var number: Int = 0

    override fun call(): Int {
        info("🖋🖋🖋 create-episode ✒️✒️✒️️️️", "")
        info("Welcome to create-episode", "👋")
        info("Creating your episode...", "")

        val id = project.toLowerCase().replace(" ", "-")
        val guestId = guest.toLowerCase().replace(" ", "-")
        val threeDigitNumber = "%03d".format(number)
        val filename = "./_posts/$date-$threeDigitNumber-$id.md"
        val imageFolder = "./assets/images/episodes/"

        // language=YAML
        val content = """
            ---
            title: "#$number - $project with $guest"
            excerpt: "TODO"
            author_profile: true
            
            description: "TODO"
            
            header:
              teaser: "/assets/images/header-single-episode.png"
              overlay_image: "/assets/images/header-single-episode.png"
              show_overlay_excerpt: false
              overlay_filter: "0.6"
              og_image: "/assets/images/episodes/$number-cover.png"
            
            date: $date
            permalink: /$number/
            redirect_from:
            - /$number/$id/
            - /$number/$id-with-$guestId/
            
            podcast_image: "/assets/images/episodes/$number-cover.png"
            podcast_episode_number: $number
            podcast_link: https://dts.podtrac.com/redirect.m4a/hosting.thebakery.dev/$number-thedevelopersbakery-$id.m4a
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
        """.trimIndent()

        File(filename).writeText(content)

        info("Podcast project title: $project", "")
        info("Podcast guest: $guest", "")
        info("Podcast date: $date", "")
        info("Podcast number: $number", "")

        succ("Episode created successfully: $filename")
        return 0
    }


    /*
     * DEBUG Prints function
     ******************************************************************/

    fun error(message: String, throwable: Throwable? = null, statusCode: Int = 1): Nothing {
        System.err.println("❌\t${Colors.ANSI_RED}$message${Colors.ANSI_RESET}")
        throwable?.let {
            System.err.print(Colors.ANSI_RED)
            it.printStackTrace()
            System.err.print(Colors.ANSI_RESET)

        }
        System.exit(statusCode)
        throw Error()
    }

    fun warn(message: String) {
        System.out.println("⚠️\t${Colors.ANSI_YELLOW}$message${Colors.ANSI_RESET}")
    }

    fun succ(message: String) {
        System.out.println("✅\t${Colors.ANSI_GREEN}$message${Colors.ANSI_RESET}")
    }

    fun info(message: String, emoji: String = "ℹ️") {
        System.out.println("$emoji\t$message")
    }

    fun String.runCommand(
            workingDir: File = File("."),
            timeoutAmount: Long = 60
    ): String? = try {
        ProcessBuilder(split("\\s".toRegex()))
                .directory(workingDir)
                .redirectOutput(ProcessBuilder.Redirect.PIPE)
                .redirectError(ProcessBuilder.Redirect.PIPE)
                .start().apply { waitFor(timeoutAmount, TimeUnit.SECONDS) }
                .inputStream.bufferedReader().readText()
    } catch (e: java.io.IOException) {
        e.printStackTrace()
        null
    }
}

CommandLine(GenerateSnippets()).execute(*args)

/*
 * ASCII Color
 ******************************************************************/

object Colors {
    val ANSI_RESET = "\u001B[0m"
    val ANSI_BLACK = "\u001B[30m"
    val ANSI_RED = "\u001B[31m"
    val ANSI_GREEN = "\u001B[32m"
    val ANSI_YELLOW = "\u001B[33m"
    val ANSI_BLUE = "\u001B[34m"
    val ANSI_PURPLE = "\u001B[35m"
    val ANSI_CYAN = "\u001B[36m"
    val ANSI_WHITE = "\u001B[37m"
}