import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { scan } from './check-neutrality.mjs';

test('env tokens match whole identifiers case-insensitively and withhold values', () => {
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
 ['zebraQuartz','cli_zebra_quartz_run',1], ['quartz','quartzite bequartz',0],
 ['zorb','gazorb',0], ['HTTPServer','cliHTTPServerRun',1],
 ['zebra-quartz','prefixZEBRA-QUARTZsuffix',1], ['zebra.quartz','prefixZEBRA.QUARTZsuffix',1],
 ['___','___',1],
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
   assert.match(output,/\[tool-name\]  \(value withheld\)/);
   assert.match(output,/\[source-path\]  \(value withheld\)/);
   assert.match(output,/\(value withheld\):0/);
  }
 } finally {rmSync(root,{recursive:true,force:true});}
});
