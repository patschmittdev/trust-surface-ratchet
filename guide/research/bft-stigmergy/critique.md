# Independent critique and response

## Arrangement

The review was done by an independent reviewer from the same model family as the author, working from a fresh context with the directory on disk, the sweep table, and a bounded list of claims to verify or refute, and with no access to the author's reasoning or working notes. This is weaker than cross-family or human review. The findings' numbers come from the reviewer's own scratch experiments, which are not part of this repository. Every number in the response was reproduced with the repository script after the repairs.

Corrected evidence
is in [results.md](results.md); interpretation is in [memo.md](memo.md).

## Findings

### 1. The sharded medium collapses under a strategy the model itself licensed

Finding: once-per-shard writes allowed `floodall`: suppress the best shard and
lure every other shard. Correctness fell from about 90 to 24 to 44 percent at
all tested Byzantine shares from 5 percent upward, meeting the sampling
[hypothesis H3's falsification condition](memo.md#hypothesis-outcomes).
Correction: added the strategy and a `globalIdentity` accounting switch, explicitly
undesigned. The memo withdraws unqualified sharding success; the switch still
faces finding 2.

### 2. A one-lure-per-identity strategy defeats the identity-bound board at high shares

Finding: globally compliant `spread` cuts correctness to 37 to 44 percent at
40 to 45 percent Byzantine, reward 0.61 versus 0.94 baseline. Window 30 restores
it; sixteen options yields 22 percent. Roughly 20 to 30 percent tolerance depends
on eight options and a ten-round window.
Correction: added `spread`; replaced the positive claim with an attention tax
parameterised by lurable cues, verifiers per cue and observation lifetime.

### 3. "About ninety percent" is one minus one over the window, reached at ten percent

Finding: single-lure correctness is about 0.75, 0.91 and 1.00 for windows 3,
10 and 30, unchanged from 10 to 45 percent Byzantine.
Correction: removed the tolerance claim; reported one lured round per window,
saturating around 10 percent.

### 4. The no-memory tolerance is N-dependent because the dissent threshold was an absolute count

Finding: at 1,000 agents honest noise contested three cues, splitting verification
and lowering tolerance to about 9 percent. Threshold 20 restored correctness at
round 11; the formula lacks population dependence.
Correction: use writer share with a two-deposit floor (at most one per identity per round). Default 2 percent restores
the 20-percent suppression case from zero. Report `pv / (1 + pv)` as an upper
transition edge, several points wide; dilution needs about fifty attackers per
honest explorer.

### 5. The collapse of pure stigmergy is not caused by amplification

Finding: without amplification, anonymous and identity-bound discovery collapse
at 1 and 2 percent. Suppression resistance reaches 40 percent with identity
binding, but flooding breaks it at 5 percent. Anonymous mean versus identity-bound
median confounds attribution: median control requires half the writers, mean
control nearly all. In memory mode the anonymous mean board beats the identity-bound median board.
Correction: report exploration/options as the discovery bound, restrict amplification's
role to dislodging coordination, name the confound. Trimmed means and minimum
writer counts remain untested.

### 6. Cost was counted on a different basis for the sharded medium than for broadcast

Finding: omitted replica receives halve apparent sharded cost; fixed replica-slot
load grows with population. Consistent crossover is about 160 agents.
Correction: count sends plus receives averaged over all nodes; state slot load
and crossover.

### 7. Broadcast equals the trusted board by construction

Finding: shared storage and identical random consumption encode synchronous signed
best-effort broadcast without equivocation, not reliable broadcast.
Correction: label equality an assumption and counted cost a lower bound.

### 8. A within-threshold lie does not beat the baseline, but the headline depends on the quality gap

Finding: best-cue agents refresh memory every round. A runner-up at 0.9 yields
only 76 to 79 percent honest correctness with no adversary at all; results depend on the 0.4 quality gap
and 0.3 dissent distance.
Correction: withdrew the predicted gain-erasing attack; named the gap assumption.

### 9. The reward sentence described a table that did not exist and the number was wrong

Finding: unsupported table reference and incorrect reward.
Correction: generate reward tables and rewrite the sentence from them.

### 10. Internal contradictions and missing files

Findings: absent results/critique; licensed but untested attack; "worst of three"
mislabelled as optimal; met falsification understated; population table contradicting
"hold at ten, waver at twenty"; unenforced global rule; unsupported README.
Correction: repaired documents, added evidence and attacks, and qualified the sweep
as "worst of five hand-picked strategies". Deposit range validation was also added.

### 11. Prior art the survey missed

Finding: missing sharded BFT (Elastico, OmniLedger, RapidChain), Algorand sortition,
Douceur's Sybil attack, Lam/Riedl and Mobasher shilling attacks, Yin/Krum aggregation
limits, Bracha broadcast, oracle/Schelling-point problems, truth discovery and
EigenTrust.
Correction: added eleven [prior-art entries](prior-art.md); identified participation
asymmetry as sparse-item shilling and shortened the open list.

## Reviewer's verdict, condensed

The positive results do not survive as stated: the ninety-percent figure is a window parameter, two static strategies inside the model's rules cut the identity-bound board to about 40 percent at high shares and the sharded medium to 24 to 44 percent at every share, the sweep was the worst of three hand-picked strategies, and the cost claim omitted replica load.

## What the critique changed

Strategies, identity accounting, validation, dissent and cost calculations changed;
the memo, [hypothesis record](memo.md#hypothesis-outcomes) and prior-art list now reflect these limits.
