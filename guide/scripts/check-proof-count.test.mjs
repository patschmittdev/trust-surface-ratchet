import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const stripComments = (source) => source.replace(/\/-[\s\S]*?-\//g, "").replace(/--[^\n]*/g, "");

const countDeclarations = (source) => [...stripComments(source).matchAll(/^\s*(?:@\[[^\]]*\]\s*)?(?:(?:private|protected|noncomputable)\s+)*(?:theorem|lemma)\s/gm)].length;

const axiomTableRows = (readme) => [...readme.matchAll(/^\| \[([^\]:]+\.lean):(\d+)\]\(Proofs\/([^#]+)#L(\d+)\) \| `([^`]+)`/gm)]
  .map(([, textFile, textLine, anchorFile, anchorLine, name]) => ({
    textFile,
    textLine: Number(textLine),
    anchorFile,
    anchorLine: Number(anchorLine),
    name,
  }));

test('declaration counter includes attribute-prefixed and private declarations', () => {
  assert.equal(countDeclarations('@[simp] theorem helper : True := by trivial'), 1);
  assert.equal(countDeclarations('private theorem hidden : True := by trivial'), 1);
  assert.equal(countDeclarations('@[simp] protected noncomputable lemma combined : True := by trivial'), 1);
});

test('proof README count matches the Lean declaration inventory', () => {
  const root = new URL('../proofs/', import.meta.url);
  const readme = readFileSync(new URL('README.md', root), 'utf8');
  const counts = [...readme.matchAll(/\*\*(\d+) theorem declarations\*\*/g)];
  assert.equal(counts.length, 1,
    'guide/proofs/README.md must contain exactly one marked count: **N theorem declarations**');

  const sources = new URL('Proofs/', root);
  const inventory = readdirSync(sources)
    .filter((name) => name.endsWith('.lean'))
    .sort()
    .map((name) => {
      const source = readFileSync(new URL(name, sources), 'utf8');
      return [name, countDeclarations(source)];
    });
  const actual = inventory.reduce((sum, [, count]) => sum + count, 0);
  assert.equal(Number(counts[0][1]), actual,
    `Proof count differs: ${inventory.map(([name, count]) => `${name}: ${count}`).join(', ')}. ` +
    'Recount and review the proof README inventory.');
});

test('declaration counter ignores block, doc and line comments', () => {
  assert.equal(countDeclarations('/-\ntheorem fake : True\n-/\n/--\ntheorem doc : True\n-/\n-- theorem line : True\ntheorem real : True := by trivial'), 1);
});

test('axiom table links name the declaration line', () => {
  const root = new URL('../proofs/', import.meta.url);
  const rows = axiomTableRows(readFileSync(new URL('README.md', root), 'utf8'));
  assert.ok(rows.length > 0, 'Expected at least one axiom-table row in guide/proofs/README.md');

  for (const row of rows) {
    assert.equal(row.anchorFile, row.textFile,
      `${row.textFile} ${row.name}: expected line ${row.textLine} in both link text and anchor`);
    assert.equal(row.anchorLine, row.textLine,
      `${row.textFile} ${row.name}: expected line ${row.textLine} in both link text and anchor`);

    const source = readFileSync(new URL(`Proofs/${row.textFile}`, root), 'utf8');
    const line = source.split(/\r?\n/)[row.textLine - 1];
    assert.match(line, new RegExp(`^\\s*axiom\\s+${row.name}\\b`),
      `${row.textFile} ${row.name}: expected axiom declaration at line ${row.textLine}`);
  }
});

test('axiom table completely inventories Lean axioms', () => {
  const root = new URL('../proofs/', import.meta.url);
  const rows = axiomTableRows(readFileSync(new URL('README.md', root), 'utf8'));
  const documented = new Set(rows.map(({ textFile, name }) => `${textFile}:${name}`));
  const sources = new URL('Proofs/', root);

  for (const file of readdirSync(sources).filter((name) => name.endsWith('.lean')).sort()) {
    const source = stripComments(readFileSync(new URL(file, sources), 'utf8'));
    for (const match of source.matchAll(/^\s*axiom\s+([A-Za-z_][A-Za-z0-9_']*)\b/gm)) {
      const line = source.slice(0, match.index).split('\n').length;
      const name = match[1];
      assert.ok(documented.has(`${file}:${name}`),
        `${file} ${name}: missing axiom-table row; expected line ${line}`);
    }
  }
});
