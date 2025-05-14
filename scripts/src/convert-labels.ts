import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';

const program = new Command();

program
  .name('convert-labels')
  .description('Convert labels')
  .version('1.0')
  .requiredOption('-i, --input <string>', 'The label file to read from');

program.parse(process.argv);

const options = program.opts();
const { input } = options;
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

function convertTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}.${String(remainingSeconds).padStart(2, '0')}`;
}

try {
  info("🏷🏷🏷 convert-labels 🏷🏷🏷");
  info("Welcome to convert-labels", "👋");
  info("Converting labels now...");

  if (!input) {
    error("No input file provided!");
  }

  const lines = fs.readFileSync(input, 'utf8').split('\n');
  lines.forEach(line => {
    const tokens = line.split('\t').slice(1);
    if (tokens.length >= 2) {
      const time = convertTime(parseFloat(tokens[0]));
      console.log(`- **${time}** ${tokens[tokens.length - 1]}`);
    }
  });

  succ("convert-labels finished successfully!");
} catch (err) {
  error('Something went wrong converting labels.', err as Error);
}