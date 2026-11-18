import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scan } from './check-neutrality.mjs';

test('env tokens match identifier parts and affixes and withhold values', () => {
  const root = mkdtempSync(join(tmpdir(), 'neutrality-'));
  const previous = process.env.NEUTRALITY_DENYLIST;
  try {
    process.env.NEUTRALITY_DENYLIST = ' , zebraquartz\n,';
    writeFileSync(join(root, 'fixture.md'), 'ZEBRAQUARTZ zebraquartzExtra');
    const hits = scan(['fixture.md'], root);
    assert.equal(hits.length, 1);
    assert.equal(hits[0].rule, 'private-token');
    assert.ok(!JSON.stringify(hits).toLowerCase().includes('zebraquartz'));
  } finally {
    if (previous === undefined) delete process.env.NEUTRALITY_DENYLIST;
    else process.env.NEUTRALITY_DENYLIST = previous;
    rmSync(root, { recursive: true, force: true });
  }
});
import { cpSync, mkdirSync, readFileSync, symlinkSync } from 'node:fs';
import { spawnSync as spawnProcess } from 'node:child_process';

function assertWithheld(output, entries) {
  const project = (value) => value.toLowerCase().replace(/[^a-z0-9]/g, '');
  for (const entry of entries.split(/[\r\n,]/).filter(Boolean)) {
    const target = project(entry);
    if (target) assert.ok(!project(output).includes(target), 'Private projection leaked');
  }
}

function spawnSync(command, args, options) {
  const result = spawnProcess(command, args, options);
  if (options.env?.NEUTRALITY_SHOW_VALUES !== 'true') {
    assertWithheld(result.stdout + result.stderr, options.env?.NEUTRALITY_DENYLIST || '');
  }
  return result;
}

test('CLI scans through a linked guide directory', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'neutrality-link-'));
  try {
    const guide = join(root, 'guide');
    const linked = join(root, 'linked-guide');
    mkdirSync(join(guide, 'scripts'), { recursive: true });
    const script = join(guide, 'scripts', 'check-neutrality.mjs');
    cpSync(new URL('./check-neutrality.mjs', import.meta.url), script);
    const token = 'zebraquartz';
    writeFileSync(join(guide, 'fixture.md'), token);
    try {
      symlinkSync(guide, linked, process.platform === 'win32' ? 'junction' : 'dir');
    } catch (error) {
      if (['EPERM', 'EACCES', 'ENOTSUP'].includes(error.code)) {
        t.skip(`Directory links unavailable: ${error.code}: ${error.message}`);
        return;
      }
      throw error;
    }
    const result = spawnSync(process.execPath, [join(linked, 'scripts', 'check-neutrality.mjs')], { encoding: 'utf8', env: { ...process.env, NEUTRALITY_DENYLIST: token } });
    assert.equal(result.status, 1, result.stderr);
    assert.ok(!(result.stdout + result.stderr).includes(token));
    assert.match(result.stderr, /Neutrality check FAILED: 1 private-context token/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

for (const required of [false, true]) test('missing private list, required=' + required, () => {
  const root = mkdtempSync(join(tmpdir(), 'neutrality-cli-'));
  try {
    mkdirSync(join(root, 'guide', 'scripts'), { recursive: true });
    const script = join(root, 'guide', 'scripts', 'check-neutrality.mjs');
    cpSync(new URL('./check-neutrality.mjs', import.meta.url), script);
    const env = { ...process.env, NEUTRALITY_REQUIRE_DENYLIST: String(required) };
    delete env.NEUTRALITY_DENYLIST;
    const result = spawnSync(process.execPath, [script], { encoding: 'utf8', env });
    assert.equal(result.status, required ? 1 : 0, result.stderr);
    assert.match(result.stdout + result.stderr, required ? /required but not configured/ : /only public pattern rules ran/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

for (const [token, text, expected] of [
 ['zebraQuartz','zebraQuartz',1], ['zebraQuartz','zebra_quartz',1],
 ['zebraQuartz','ZEBRA_QUARTZ',1], ['zebraQuartz','cliZebraQuartzRun',1],
 ['zebraQuartz','cli_zebra_quartz_run',1], ['quartz','quartzite bequartz',1],
 ['zorb','gazorb',1], ['ZEBRAQuartz','cliZEBRAQuartzRun',1],
 ['zebra-quartz','prefixZEBRA-QUARTZsuffix',1], ['zebra.quartz','prefixZEBRA.QUARTZsuffix',1],
 ['___','___',0],
]) test('synthetic matching: '+text, () => {
 const root=mkdtempSync(join(tmpdir(),'neutrality-parts-'));
 const previous=process.env.NEUTRALITY_DENYLIST;
 try {
  process.env.NEUTRALITY_DENYLIST=token;
  writeFileSync(join(root,'fixture'),text);
  const hits=scan(['fixture'],root);
  assert.equal(hits.length,expected);
  mkdirSync(join(root,'guide','scripts'),{recursive:true});
  const script=join(root,'guide','scripts','check-neutrality.mjs');
  cpSync(new URL('./check-neutrality.mjs',import.meta.url),script);
  const result=spawnSync(process.execPath,[script],{encoding:'utf8',env:{...process.env,NEUTRALITY_DENYLIST:token,NEUTRALITY_SHOW_VALUES:'false'}});
  assert.equal(result.status,expected ? 1 : 0,result.stderr);
  assert.ok(!(result.stdout+result.stderr).toLowerCase().includes(token.toLowerCase()));
  assert.ok(!JSON.stringify(hits).toLowerCase().includes(token.toLowerCase()));
 } finally {
  if(previous===undefined) delete process.env.NEUTRALITY_DENYLIST; else process.env.NEUTRALITY_DENYLIST=previous;
  rmSync(root,{recursive:true,force:true});
 }
});
for (const show of [false,true]) test('CLI scope and output withholding, show='+show,()=>{
 const root=mkdtempSync(join(tmpdir(),'neutrality-scope-'));
 try {
  mkdirSync(join(root,'guide','scripts'),{recursive:true});
  mkdirSync(join(root,'gate'));
  mkdirSync(join(root,'zebraQuartz'));
  const script=join(root,'guide','scripts','check-neutrality.mjs');
  cpSync(new URL('./check-neutrality.mjs',import.meta.url),script);
  writeFileSync(join(root,'guide','fixture.md'),'cli_zebra_quartz_run path/zebraQuartz.mjs');
  writeFileSync(join(root,'gate','fixture.js'),'zebraQuartz');
  writeFileSync(join(root,'runner'),'ZEBRAQUARTZ');
  writeFileSync(join(root,'zebraQuartz','fixture.md'),'clean');
  const result=spawnSync(process.execPath,[script],{encoding:'utf8',env:{...process.env,NEUTRALITY_DENYLIST:'zebraQuartz',NEUTRALITY_SHOW_VALUES:String(show)}});
  assert.equal(result.status,1);
  const output=result.stdout+result.stderr;
  assert.match(output,/private-token/);
  assert.match(output,/gate\/fixture.js/);
  assert.match(output,/runner/);
  if(show) assert.match(output,/zebraQuartz/);
  else {
   assert.ok(!/zebra.?quartz/i.test(output),output);
   assert.match(output,/\[tool-name\]$/m);
   assert.match(output,/\[source-path\]$/m);
   assert.match(output,/\(path withheld\):0/);
  }
 } finally {rmSync(root,{recursive:true,force:true});}
});

import { matches, parts } from './check-neutrality.mjs';
import { chmodSync } from 'node:fs';

for (const [entry, texts, expected] of [
  ['zetaQuorum', ['zetaQuorum', 'zeta_quorum', 'ZETA_QUORUM', 'zeta-quorum', 'cli_zeta_quorum_run', 'zeta-quorum/x.mjs'], true],
  ['zetaQuorum', ['the zeta quorum', 'Zeta Quorum'], false],
  ['=zetaQuorum', ['zeta_quorum', 'zeta-quorum/x.mjs'], true],
  ['=zetaQuorum', ['Zeta Quorum', 'libzetaquorum'], false],
  ['=zeta-quorum', ['the Zeta Quorum'], true],
  ['zeta quorum', ['the Zeta Quorum', 'zeta_quorum'], true],
  ['zeta-quorum', ['zeta-quorum', 'zeta_quorum', 'ZETA_QUORUM', 'zetaQuorum', 'zetaquorum', 'the zeta quorum', 'Zeta Quorum', 'zeta quorum', 'the Zeta Quorum', 'cli_zeta_quorum_run', 'zeta-quorum/x.mjs'], true],
  ['zetacore', ['zetacores', 'libzetacore', 'zetacore2'], true],
  ['=tarmox', ['tarmox', 'TARMOX_X', 'tarmoxArm'], true],
  ['=tarmox', ['xtarmoxy', 'tarmoxs'], false],
  ['tarmox', ['star moxie'], false],
]) {
  for (const text of texts) test('parts matching: ' + entry + ' / ' + text, () => {
    assert.equal(matches(text, entry), expected);
  });
}
test('acronym boundary', () => assert.deepEqual(parts('ZEBRAQuartz'), ['zebra', 'quartz']));

for (const show of [false, true]) test('all output paths, show=' + show, (t) => {
  const root = mkdtempSync(join(tmpdir(), 'neutrality-output-'));
  try {
    mkdirSync(join(root, 'guide', 'scripts'), { recursive: true });
    const script = join(root, 'guide', 'scripts', 'check-neutrality.mjs');
    cpSync(new URL('./check-neutrality.mjs', import.meta.url), script);
    writeFileSync(join(root, 'guide', 'fixture.md'), 'cli_zetacore_run cli_public_run');
    writeFileSync(join(root, 'zetacore.txt'), 'ZETACORE');
    writeFileSync(join(root, 'binary'), Buffer.from([0, 1]));
    const link = join(root, 'zetacore-link');
    try {
      symlinkSync(join(root, 'absent'), link, process.platform === 'win32' ? 'junction' : 'file');
    } catch (error) {
      if (error.code === 'EPERM') { t.skip('Link creation denied: EPERM'); return; }
      throw error;
    }
    const env = { ...process.env, NEUTRALITY_DENYLIST: 'zetacore', NEUTRALITY_SHOW_VALUES: String(show) };
    let result = spawnSync(process.execPath, [script], { encoding: 'utf8', env });
    let output = result.stdout + result.stderr;
    assert.equal(result.status, 1, output);
    assert.match(output, /\[unreadable\]/);
    assert.match(output, /scanned 3 files; skipped public rules for 1 binary files/);
    assert.match(output, /\[tool-name\]/);
    assert.equal(/zetacore/i.test(output), show, output);
    if (!show) {
      assert.ok(!output.includes('cli_public_run'), output);
      assert.match(output, /\(path withheld\)/);
    }
    // Inject an unexpected failure in the isolated CLI copy, never production.
    writeFileSync(script, readFileSync(script, 'utf8').replace("const hits = scan(['']);", "throw new Error('ZETACORE');"));
    result = spawnSync(process.execPath, [script], { encoding: 'utf8', env });
    output = result.stdout + result.stderr;
    assert.equal(result.status, 2, output);
    assert.match(output, /internal error/);
    assert.equal(/zetacore/i.test(output), show, output);
    if (!show) assert.ok(!output.includes('Error:'), output);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('unreadable file fails closed where permissions are enforced', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'neutrality-mode-'));
  const file = join(root, 'fixture');
  try {
    writeFileSync(file, 'clean');
    chmodSync(file, 0);
    try { readFileSync(file); t.skip('OS permits reading mode-zero file'); return; }
    catch (error) { assert.ok(['EACCES', 'EPERM'].includes(error.code)); }
    assert.equal(scan(['fixture'], root)[0].rule, 'unreadable');
  } finally { chmodSync(file, 0o600); rmSync(root, { recursive: true, force: true }); }
});

test('private entries cannot span LF, CRLF, or CR lines', () => {
  const root = mkdtempSync(join(tmpdir(), 'neutrality-lines-'));
  const previous = process.env.NEUTRALITY_DENYLIST;
  try {
    process.env.NEUTRALITY_DENYLIST = 'zeta-quorum';
    for (const newline of ['\n', '\r\n', '\r']) {
      writeFileSync(join(root, 'fixture'), 'zeta' + newline + 'quorum');
      assert.equal(scan(['fixture'], root).length, 0);
    }
  } finally {
    if (previous === undefined) delete process.env.NEUTRALITY_DENYLIST;
    else process.env.NEUTRALITY_DENYLIST = previous;
    rmSync(root, { recursive: true, force: true });
  }
});

function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), 'neutrality-regression-'));
  try {
    mkdirSync(join(root, 'guide', 'scripts'), { recursive: true });
    const script = join(root, 'guide', 'scripts', 'check-neutrality.mjs');
    cpSync(new URL('./check-neutrality.mjs', import.meta.url), script);
    const cli = (entry, show = 'false') => spawnSync(process.execPath, [script], {
      encoding: 'utf8', timeout: 5000,
      env: { ...process.env, NEUTRALITY_DENYLIST: entry, NEUTRALITY_SHOW_VALUES: show },
    });
    run(root, cli);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

for (const show of ['true', 'TRUE', '1', 'yes']) {
  test('only exact true reveals normalized values: ' + show, () => fixture((root, cli) => {
    writeFileSync(join(root, 'guide', 'fixture.md'), 'zebra_quartz cli_zebra_quartz_run');
    const result = cli('zebraQuartz', show);
    assert.equal(result.status, 1);
    if (show === 'true') assert.match(result.stderr, /zebra_quartz/);
  }));
}

test('prefixed paths, directories, dangling links and projection withholding', () => fixture((root, cli) => {
  writeFileSync(join(root, 'guide', 'libzeta-quorum.md'), 'cli_public_run');
  mkdirSync(join(root, 'libzeta-quorum'));
  symlinkSync(join(root, 'absent'), join(root, 'libzeta-quorum-link'),
    process.platform === 'win32' ? 'junction' : 'file');
  // Exact-run matching rejects this prefix, but output must still hide it.
  writeFileSync(join(root, 'guide', 'libzetaquorum.md'), 'cli_public_run');
  for (const entry of ['zeta-quorum', '=zeta-quorum']) {
    const result = cli(entry);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /\(path withheld\):1 \[tool-name\]/);
    assert.match(result.stderr, /\[unreadable\]/);
  }
  assert.equal(matches('libzeta-quorum', 'zeta-quorum'), true);
  assert.equal(matches('libzeta-quorum', '=zeta-quorum'), false);
}));

test('one MB extensionless line finishes below two seconds', () => fixture((root, cli) => {
  writeFileSync(join(root, 'guide', 'fixture.md'), 'a-'.repeat(524288));
  const start = performance.now();
  assert.equal(cli('').status, 0);
  const elapsed = performance.now() - start;
  console.log('one MB scan milliseconds: ' + elapsed.toFixed(1));
  assert.ok(elapsed < 2000, 'One MB scan took ' + elapsed + ' ms');
}));

test('NUL projections apply private rules for both UTF16 byte orders and BOM states', () => fixture((root, cli) => {
  for (const be of [false, true]) for (const bom of [false, true]) {
    let bytes = Buffer.from('zebraquartz cli_public_run', 'utf16le');
    if (be) bytes.swap16();
    if (bom) bytes = Buffer.concat([Buffer.from(be ? [0xfe, 0xff] : [0xff, 0xfe]), bytes]);
    writeFileSync(join(root, 'guide', 'fixture.txt'), bytes);
    const result = cli('zebraquartz');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /\[private-token\]/);
    assert.doesNotMatch(result.stderr, /\[tool-name\]/);
    assert.match(result.stdout, /private list still applied/);
  }
  writeFileSync(join(root, 'guide', 'fixture.txt'), Buffer.from('\0zebraquartz\0'));
  assert.equal(cli('zebraquartz').status, 1);
}));

test('directory links do not hide public findings or recurse into parents', () => fixture((root, cli) => {
  writeFileSync(join(root, 'guide', 'fixture.md'), 'cli_public_run');
  const type = process.platform === 'win32' ? 'junction' : 'dir';
  symlinkSync(join(root, 'guide'), join(root, 'aaa'), type);
  symlinkSync(root, join(root, 'guide', 'parent'), type);
  const result = cli('');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /guide\/fixture.md:1 \[tool-name\]/);
  assert.doesNotMatch(result.stderr, /unreadable/);
}));
