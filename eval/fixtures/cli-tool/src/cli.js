#!/usr/bin/env node
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const STORE = resolve(process.cwd(), '.shipcheck.json');

function load() {
  if (!existsSync(STORE)) return { items: [] };
  return JSON.parse(readFileSync(STORE, 'utf8'));
}

function save(data) {
  writeFileSync(STORE, JSON.stringify(data, null, 2) + '\n');
}

function add(text) {
  const data = load();
  data.items.push({ id: data.items.length + 1, text, done: false });
  save(data);
  console.log(`added #${data.items.length}: ${text}`);
}

function list() {
  const data = load();
  if (data.items.length === 0) {
    console.log('no checks yet. add one with: shipcheck add "run the test suite"');
    return;
  }
  for (const item of data.items) {
    console.log(`${item.done ? '[x]' : '[ ]'} #${item.id} ${item.text}`);
  }
}

function done(id) {
  const data = load();
  const item = data.items.find((i) => i.id === Number(id));
  if (!item) {
    console.error(`no check with id ${id}`);
    process.exitCode = 1;
    return;
  }
  item.done = true;
  save(data);
  console.log(`checked off #${item.id}: ${item.text}`);
}

function run() {
  const data = load();
  const open = data.items.filter((i) => !i.done);
  const total = data.items.length;
  console.log(`shipcheck: ${total - open.length}/${total} checks complete`);
  if (open.length === 0 && total > 0) {
    console.log('all clear. ship it!');
    return;
  }
  for (const item of open) {
    console.log(`  blocking: #${item.id} ${item.text}`);
  }
  process.exitCode = open.length > 0 ? 1 : 0;
}

const [cmd, ...rest] = process.argv.slice(2);
switch (cmd) {
  case 'add':
    add(rest.join(' '));
    break;
  case 'list':
    list();
    break;
  case 'done':
    done(rest[0]);
    break;
  case 'run':
    run();
    break;
  default:
    console.log('usage: shipcheck <add|list|done|run>');
    console.log('  add "text"   add a release check');
    console.log('  list         show all checks');
    console.log('  done <id>    mark a check complete');
    console.log('  run          fail if any check is open');
    process.exitCode = cmd ? 1 : 0;
}
