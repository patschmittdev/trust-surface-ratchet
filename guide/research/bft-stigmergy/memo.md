# Memo: what composes, what does not, and why

Spike result, 2026-09-09, revised after an independent same-model-family review.
Evidence: [prior art](prior-art.md), [results](results.md),
[threat model](threat-model.md), [critique](critique.md).

## The claim under test

Can Byzantine fault tolerance (BFT) principles give stigmergic coordination
both scalable communication and resistance to deceptive cues?

## Verdict

Trusting agents collapse with a few percent adversarial identities, even without
amplification: attackers need only outnumber honest explorers of an undiscovered
best cue. Scalable probabilistic Byzantine agreement already exists, but agreement
does not establish external truth. Per-cue majority broadcast buys nothing over
a trusted board here, at sixty to a thousand times the message cost.

Identity-bound deposits, visible dissent, conflict-directed verification and recent
personal observations convert deception into an attention tax, not a BFT tolerance
bound. Reward loss is small through 20 percent Byzantine identities, about a quarter
at 30 percent and about 40 percent at 45 percent. Its size depends on lurable cues,
honest verifiers per cue and observation lifetime.

Sharding alone breaks global identity accounting. A static attacker writing to every
shard holds correctness below 40 percent at nearly every tested cell from 10 percent up. A cross-shard
accounting switch has a maximum memory-on correctness gap of 8 percentage points from the single board
(84 versus 92 percent at N=60, 20 percent Byzantine), but
its implementation and cost are unresolved.

## Hypothesis outcomes

- H1: Anonymous, uncapped deposits let a small amplifying minority collapse coordination. Survives with a corrected cause: exploration rate over option count sets discovery collapse; amplification matters for dislodging an established population.
- H2: Identity and action binding lift tolerance toward the honest-majority bound without changing per-agent cost. H2 is falsified as written.
- H3: Sampled replica reads with a per-option median keep O(k) cost while tolerating Byzantine replicas well below half. H3 is falsified as modelled: per-shard identity enforcement permits collapse at every tested share.
- H4: The composition costs a small constant of pure stigmergy and approaches broadcast tolerance. H4 is withdrawn. The composition does not approach the honest-majority bound.

## What each ingredient buys

- **Identity binding:** one deposit per identity per round removes amplification,
  but discovery still fails around exploration rate divided by option count,
  about 1 percent here. Against suppression of established coordination, the
  threshold moves from under 20 to over 40 percent. Lures still exploit cues
  without honest writers: participation asymmetry is the known sparse-item
  shilling attack. Anonymous mean versus identity-bound median confounds this
  comparison; a median yields to half its writers, a mean to nearly all. In memory mode the anonymous mean board beats the identity-bound median board.
- **Dissent visibility:** signed per-identity deposits expose disagreement that
  anonymous additive deposits hide. Use a writer share rather than an absolute
  count, which flags honest noise at larger populations; the corrected rule
  retains a two-deposit floor (at most one per identity per round). Diluting honest dissent requires about fifty
  attacking identities per honest explorer.
- **Conflict-directed verification:** spending share `pv` on contested, recently
  unchecked cues gives the trusting regime an upper transition edge
  `b < pv / (1 + pv)`, about 23 percent by default. Observations sit several
  points below this across populations. Reward falls from 94 to about 70 percent
  of optimum while it holds; increasing verification spends more effort.
- **Private observation:** acting on a cue must reveal its truth, and recent
  observations override the medium. Single-lure loss saturates around 10 percent
  Byzantine identities at one lured round per window. With eight options,
  a ten-round window and 45 percent attackers, multiple lures consume most
  rounds. A thirty-round window restores the single-board figure; sixteen
  options halves it. A within-threshold lie does no worse than honest noise
  because agents on the best cue refresh memory each round.
- **Sampling and sharding:** small replica sets give flat population-average
  per-node cost from 60 to 1,000 agents, with a broadcast crossover around 160
  on a sends-plus-receives basis. Byzantine replicas answer with attacking
  vectors, reducing tolerance; fixed replica slots carry load growing with
  population. Per-shard identity enforcement permits flooding every shard.
- **Cross-shard accounting:** the switch restores performance but is not a
  design. A global view reintroduces broadcast cost; consumable action tokens
  require attested actions and remain undesigned.
- **Broadcast:** equality with the trusted board is assumed by construction:
  signed best-effort synchronous broadcast without equivocation. Counted cost
  is a lower bound; real reliable broadcast costs more.

## The composition, stated as a design

Shard cues onto small, unpredictably assigned committees. Require signed deposits,
externally scarce identities and one deposit per epoch across shards. Sample replicas
with a robust aggregate chosen with median vulnerability in mind. Expose dissent
shares, direct effort toward unchecked contested cues, and prefer recent personal
observations. The observation window must be long relative to lurable cue count.
These conditions describe the composition; cross-shard enforcement remains open.
Deception becomes an attention tax only when acting reveals truth.

## What this does not show

- Novelty: swarm-blockchain work dates to 2018, ledger-state work formalises it
  in 2026, and sharding and shilling attacks have prior literature. Only two
  abstract open items remain in [prior art](prior-art.md).
- Transferable numbers: five hand-picked static strategies, synchronous rounds,
  honest shard assignment, identities scarce by fiat, one-round verification,
  and a best cue 0.4 above rivals constrain results. The 0.3 dissent distance
  matters. With a runner-up at 0.9, honest correctness is only 76 to 79 percent with no adversary at all.
- Unlimited scaling: capacity, consistency and per-replica load remain limits;
  stigmergic swarms can perform worse than random walkers at high density.
  Only flat average per-node cost is supported here.

## What to do next, if anything

Read the full ledger-state and sharded-BFT papers; the open list may disappear.
Test trimmed means or minimum writer counts to separate aggregation from identity
binding. Replace assumed identity scarcity with concrete costs. Design and cost
cross-shard accounting before treating sharding as a working composition.
