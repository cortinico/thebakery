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
import kotlin.time.toDuration

@OptIn(kotlin.time.ExperimentalTime::class)
@Command(name = "convert-labels", mixinStandardHelpOptions = true, version = ["1.0"])
class GenerateSnippets : Callable<Int> {

    @Option(names = ["-i", "--input"], paramLabel = "INPUT", description = ["The label file to read from"])
    private var input: String = ""

    override fun call(): Int {
        info("🏷🏷🏷 convert-labels 🏷🏷🏷", "")
        info("Welcome to convert-labels", "👋")
        info("Converting labels now...", "")

        if (input.isNullOrBlank()) {
            error("No input file provided!")
        }

        File(input).readLines().forEach {
            val tokens = it.split('\t').drop(1)
            val time = tokens[0].toDouble().toDuration(TimeUnit.SECONDS).toComponents { minutes: Int, seconds: Int, nanoseconds: Int ->
                "%02d.%02d".format(minutes, seconds)
            }
            System.err.println("- **${time}** ${tokens.last()}")
        }
        succ("convert-labels finished successfully!")
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