import { Command } from 'commander';
import * as path from 'path';
import { attachAudio, findEpisodeFile } from './episode-audio';

const program = new Command();

program
  .name('attach-audio')
  .description('Fill in the audio details of an episode from the recorded file')
  .version('1.0')
  .requiredOption('-n, --number <number>', 'Number of the episode', parseInt)
  .requiredOption('-a, --audio <string>', 'Path to the audio file of the episode');

program.parse(process.argv);

const options = program.opts();
const { number, audio } = options;

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

try {
  info("🎙🎙🎙 attach-audio 🎙🎙🎙");
  info("Welcome to attach-audio", "👋");
  info("Attaching your audio file...");

  const episodePath = findEpisodeFile(number);
  const update = attachAudio(episodePath, audio);

  if (update.previousUrl) {
    warn(`The episode pointed at ${path.basename(new URL(update.previousUrl).pathname)}`);
    warn(`but the audio file is named ${path.basename(audio)}, so the URL was updated.`);
  }

  info(`Episode: ${episodePath}`);
  info(`Duration: ${update.duration}`);
  info(`Length: ${update.length} bytes`);
  info(`Audio URL: ${update.url}`);

  succ(`Audio attached successfully to episode #${number}`);
} catch (err) {
  error('Something went wrong attaching the audio file.', err as Error);
}
