import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const simulate = fileURLToPath(new URL('./simulate', import.meta.url));
const run = (...args) => {
  const result = spawnSync(process.execPath, [simulate, ...args], { timeout: 4500 });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr.toString());
  return result.stdout;
};
const args = ['--protocol', 'attested', '--N', '200', '--byz', '0.2', '--seed', '1'];

test('seeded simulation stdout is byte-identical', { timeout: 5000 }, () => {
  assert.deepEqual(run(...args), run(...args));
});

test('simulation emits the stable JSON keys', { timeout: 5000 }, () => {
  const output = JSON.parse(run(...args).toString());
  for (const key of ['protocol', 'verify', 'memory', 'globalIdentity', 'N', 'byz', 'adversary', 'seed', 'correct', 'reward', 'roundsTo80', 'messages']) {
    assert.ok(Object.hasOwn(output, key), key);
  }
});

test('simulation help exits successfully', { timeout: 5000 }, () => {
  run('--help');
});

import { readFileSync } from 'node:fs';
import vm from 'node:vm';
test('dissent counts deposits by one identity across two rounds', () => {
  const source = readFileSync(simulate, 'utf8');
  const storeCode = source.slice(source.indexOf('class WindowStore'), source.indexOf('// Protocols.'));
  const context = vm.createContext({});
  vm.runInContext('const median = vals => vals.length ? [...vals].sort((a,b)=>a-b)[Math.floor(vals.length/2)] : null;\n' + storeCode + '\nthis.Store = WindowStore;', context);
  const store = new context.Store(1, 10);
  for (let round = 0; round < 2; round++) {
    store.beginRound();
    store.deposit('dissenter', 0, 1);
    store.deposit('honest-a', 0, 0);
    store.deposit('honest-b', 0, 0);
  }
  assert.equal(store.aggregate().dissentCount[0], 2);
});
