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
import { spawnSync } from 'node:child_process';

test('CLI scans through a linked guide directory', (t) => {
  const root = mkdtempSync(join(tmpdir(), 'neutrality-link-'));
  try {
    const guide = join(root, 'guide');
    const linked = join(root, 'linked-guide');
    mkdirSync(join(guide, 'scripts'), { recursive: true });
    const script = join(guide, 'scripts', 'check-neutrality.mjs');
    cpSync(new URL('./check-neutrality.mjs', import.meta.url), script);
    const token = 'TestOnlyLinkedToken';
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
 ['zorb','gazorb',1], ['HTTPServer','cliHTTPServerRun',1],
 ['zebra-quartz','prefixZEBRA-QUARTZsuffix',0], ['zebra.quartz','prefixZEBRA.QUARTZsuffix',0],
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
  ['=lever', ['lever', 'LEVER_X', 'leverArm'], true],
  ['=lever', ['cleverly', 'levers'], false],
  ['tarmox', ['star moxie'], false],
]) {
  for (const text of texts) test('parts matching: ' + entry + ' / ' + text, () => {
    assert.equal(matches(text, entry), expected);
  });
}
test('acronym boundary', () => assert.deepEqual(parts('HTTPServer'), ['http', 'server']));

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
    assert.match(output, /scanned 3 files; skipped 1 binary files/);
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
