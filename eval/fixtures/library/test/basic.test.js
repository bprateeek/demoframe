import { test } from 'node:test';
import assert from 'node:assert/strict';
import { score, best, highlight } from '../src/index.js';

test('exact prefix beats scattered match', () => {
  assert.ok(score('doc', 'docs/readme.md') > score('doc', 'dashboard-config.yml'));
});

test('non-matching query scores zero', () => {
  assert.equal(score('xyz', 'readme'), 0);
});

test('best ranks and limits', () => {
  const files = ['src/index.js', 'docs/intro.md', 'dist/index.min.js', 'package.json'];
  const top = best('idx', files, 2);
  assert.equal(top.length, 2);
  assert.equal(top[0].candidate, 'src/index.js');
});

test('highlight wraps matched characters', () => {
  assert.equal(highlight('rm', 'readme'), '[r]ead[m]e');
});
