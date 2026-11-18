# Threat model for the spike simulation

This names what the adversary in [`simulate`](simulate) can do, what it cannot,
and which of those limits are modelling choices rather than facts about any
real network. A reader who wants to attack the conclusion should start with the
"not modelled" list.

## Assets and goal

The honest population wants most of its members to act on the truly best
option and to keep doing so. The adversary wants honest agents to act on a
worse option, or to waste honest effort, for as long as possible.

## Adversary capabilities (modelled)

| Capability | Pure stigmergy | Identity-bound board | Broadcast | Sharded, sampled medium |
|---|---|---|---|---|
| Controls a fixed fraction `byz` of identities | yes | yes | yes | yes |
| Writes every round without acting | yes | yes | yes | yes |
| Writes about any option, not only one it visited | yes | yes | yes | yes |
| Amplifies each write `amp` times | yes | no | no | no |
| Writes once per identity per round | n/a | enforced | enforced | enforced per shard, so once per shard, unless `globalIdentity` is set |
| Write breadth per round (how many cues one identity can lie about) | any, `amp` times each | one | one | one per shard, so all of them; one with `globalIdentity` |
| Deposits outside [0, 1] | accepted | rejected | rejected | rejected by honest replicas |
| Controls the same fraction of storage replicas | n/a (board trusted) | n/a (board trusted) | n/a (no medium) | yes |
| A Byzantine replica lies on every read | n/a | n/a | n/a | yes: returns best=0, decoy=1, others 0.5, dissent 0 |
| Writes before honest agents each round | yes | yes | yes | yes |
| Coordinates perfectly (all Byzantine identities follow one strategy) | yes | yes | yes | yes |

Five fixed strategies are run for every cell and the worst result is kept.
The first three were the author's; the last two were added by the independent
critique, which showed the first three were not the adversary's best. Five
hand-picked strategies are still not a proof of optimality.

- **flood**: every Byzantine identity reports the worst true option as perfect.
- **suppress**: every Byzantine identity reports the best option as worthless.
- **split**: alternating by identity and round between the two. In the sharded
  medium without global identity accounting a split identity does both each
  round, because a shard cannot see the other shard.
- **spread**: each identity writes one lure, and the lures are spread over
  every non-best option. Obeys the global identity rule.
- **floodall**: in the sharded medium without global identity accounting, each
  identity writes a zero to the best option and a lure to every other option,
  every round. On a single board this degrades to suppress.

Byzantine replicas answer every read with a vector that matches the
strategy: best at 0, decoy at 1, and under spread or floodall every non-best
option at 1.

## Honest capabilities (modelled)

- Honest agents act on one option per round and observe its true quality plus
  Gaussian noise (standard deviation 0.1), clipped to [0, 1].
- With the `memory` switch, an honest agent remembers its own observations for
  `window` rounds and prefers them to the medium. Without it, the agent trusts
  the medium.
- With the `verify` switch, an honest agent spends a share `pv` of its rounds
  visiting an option the medium reports as contested, unless it checked that
  option itself within the window. Contested means at least `dissentMin`
  deposits, and at least a share `dissentFrac` of deposits about the option
  across the window, sit far from its median (at most one per identity per round).
  One dissenter depositing in two rounds can therefore meet a floor of two. The share was added after the
  critique showed an absolute count flags honest noise at large N.
- Honest agents explore uniformly at rate `eps`.

## Not modelled, and why it matters

These are the limits of the model. Each one is a way the real answer could be
worse than the table.

1. **Adaptive adversary.** The five strategies are fixed. An adversary that
   learns the honest policy could, for example, report the best option as
   merely mediocre instead of worthless, which reduces dissent below the
   threshold and evades verification. The dissent test is a fixed distance from
   the median; a value chosen to sit just inside that distance is not counted.
2. **Sybil cost.** The identity rule assumes identities are scarce. Nothing in
   the model makes them scarce. Stake, proof of work, certification and social
   vouching each buy this at their own price, and each has its own attacks.
3. **Replica assignment.** Shards are assigned pseudo-randomly at world
   creation and the adversary does not choose which identities join which
   shard. An adversary that can influence assignment (grinding, targeted
   joining) can capture a shard with far fewer than half the population. The
   standard defence is unpredictable assignment plus a shard size chosen so
   that capture probability is negligible, which grows the cost term `r`.
4. **Eclipse of the sampler.** Reads sample uniformly from the shard. An
   adversary that controls an agent's view of the membership list can make
   every sample land on Byzantine replicas. Membership is assumed honest.
5. **Timing.** Rounds are synchronous. Deposits are visible to the whole shard
   at the end of the round they are made. No latency, no partition, no clock
   skew, no reordering.
6. **Cross-shard identity accounting.** Without it a Byzantine identity
   writes once to every shard per round, and the critique showed this alone
   breaks the sharded mechanism at every tested share. A global per-round cap
   would need either a global view (broadcast cost again) or an action token
   that is consumed by a deposit and verifiable by the shard. The
   `globalIdentity` switch models the effect of such a mechanism, not the
   mechanism, its cost, or its own attacks.
7. **Medium capacity.** Shards have unbounded storage and answer every read.
   Real media saturate. The stigmergy literature reports that at high density
   a stigmergic algorithm can do worse than non-interacting random walkers;
   nothing here contradicts that.
8. **Observation cost.** Acting on an option and observing its quality costs
   one round and nothing else. In a network where verification is expensive,
   delayed or itself spoofable, the `memory` regime collapses toward the
   no-memory regime, and the no-memory table is the one that applies.
9. **Ground truth is stable.** Option qualities never change. A drifting truth
   raises the value of decay and lowers the value of memory; the model does not
   explore that trade.
10. **Message counting.** Costs are counted as messages sent plus received,
    averaged over all nodes, with gossip between replicas not modelled at all.
    For the sharded medium the average hides that the fixed set of replica
    slots carries a per-slot load that grows with N. Reads of every option
    every round are counted in full. In a real system an agent reads only the
    cues near its next decision, so `M` should be read as neighbourhood size,
    not world size. The broadcast row assumes signed best-effort broadcast in
    a synchronous round equals a trusted store; real reliable broadcast costs
    more.
11. **The quality gap.** The best option is 0.4 above every rival and the
    dissent distance is 0.3. The critique showed that with a rival at 0.9 the
    honest population alone reaches under 80 percent, so every headline number
    depends on this gap.

## What the model is for

It is an existence argument about shapes: whether a mechanism can sit in the
cheap-and-tolerant corner at all, and which ingredient moves it there. It is
not evidence that any particular network is secure.
