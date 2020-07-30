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

    @Option(names = ["-t", "--title"], description = ["Title of the episode"])
    private var title: String = ""

    @Option(names = ["-i", "--image"], paramLabel = "IMAGE", description = ["The input .yml file to read from"])
    private var image: String = ""

    override fun call(): Int {
        info("🖋🖋🖋 create-episode ✒️✒️✒️️️️", "")
        info("Welcome to create-episode", "👋")
        info("Creating your episode...", "")

        val date = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd"))
        val id = title.toLowerCase().replace(" ", "-")
        val filename = "./_posts/$date-$id.md"
        val imageFolder = "./assets/images/posts/$id"
        val headerFilename = "$imageFolder/header.jpg"
        val teaserFilename = "$imageFolder/teaser.jpg"

        // language=YAML
        val content = """
            ---
            title: "$title"
            categories: "Android"
            published: false

            excerpt: "TODO"

            header:
                image: "$headerFilename"
                teaser: "$teaserFilename"
                caption: "Royal Djurgården - Stockholm, Sweden"
            ---

            # Source Code

            {% highlight kotlin linenos %}
            val thisIs = "Some kotlin code with line numbers"
            {% endhighlight %}

            # Notice Boxes

            Single line Info Box
            {: .notice--info}

            Single line Warning Box
            {: .notice--warning}

            Single line Danger Box
            {: .notice--danger}

            {% capture notice-info %}
            **Multi Line Info Box**

            Where you can put code, images and whatsoever needed
            {% endcapture %}

            <div class="notice--info">{{ notice-info | markdownify }}</div>

            # Images

            ![sample-image](${headerFilename.drop(1)})

            <figure>
                <img src="${headerFilename.drop(1)}" alt="image with caption">
                <figcaption>Caption goes here</figcaption>
            </figure>

        """.trimIndent()

        File(filename).writeText(content)

        if (image.isNotBlank()) {
            info("Resizing your image...", "")
            Files.createDirectories(Paths.get(imageFolder));
            "mogrify -resize 1920x -quality 85 -write $headerFilename $image".runCommand()
            "mogrify -resize 600x -quality 85 -write $teaserFilename $image".runCommand()
        } else {
            warn("No image provided, skipping resizing.")
        }

        info("Blogpost title: $title", "")
        info("Blogpost id: $id", "")
        info("Blogpost file: $filename", "")
        info("Header file: $headerFilename", "")
        info("Teaser file: $teaserFilename", "")

        succ("Blogpost created successfully!")
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