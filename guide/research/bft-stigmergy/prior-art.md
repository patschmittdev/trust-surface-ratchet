# Prior art: Byzantine fault tolerance meets stigmergy

This survey uses title and abstract search summaries, not full-text review.

Searched 2026-09-09. Coverage caveat: the survey used web search results only;
the papers themselves (arXiv, publisher sites, preprint mirrors) were not read.
Every entry below was
verified at title and abstract level from search summaries, not from full text.
Author lists marked "not confirmed" were not visible in the summaries. Treat
this as a map for a reader with library access, not as a finished survey.

## Short answer

Yes, people have worked on this, from three directions, and one of them has
been doing it for eight years. The exact framing in the hypothesis (apply BFT
principles to the stigmergic medium to get flat cost and high tolerance) is
closest to the swarm-robotics blockchain line from Dorigo's group and to a 2026
formal framework called ledger-state stigmergy. What appears less covered, at
abstract level, is listed under "What looks open".

## Direction 1: BFT machinery wrapped around a swarm's shared medium

The swarm-robotics community reached for blockchain consensus as the Byzantine
fault tolerance layer for robot swarms, and several of the scenarios are
explicitly stigmergic (foraging with pheromone-like traces).

- Strobel, Castelló Ferrer, Dorigo. *Managing Byzantine Robots via Blockchain
  Technology in a Swarm Robotics Collective Decision Making Scenario.* AAMAS
  2018. First proof of concept: a binary collective decision in a simulated
  swarm, with a smart contract acting as the shared, tamper-evident medium and
  Byzantine robots detected and excluded through their inconsistent behaviour.
  <https://ifmas.csc.liv.ac.uk/Proceedings/aamas2018/pdfs/p541.pdf>
- Strobel, Castelló Ferrer, Dorigo. *Blockchain Technology Secures Robot
  Swarms: A Comparison of Consensus Protocols and Their Resilience to Byzantine
  Robots.* Frontiers in Robotics and AI, 2020. Compares consensus protocols by
  their resilience to Byzantine robots. This is the closest existing "which BFT
  flavour for a swarm" study.
  <https://www.frontiersin.org/journals/robotics-and-ai/articles/10.3389/frobt.2020.00054/full>
- Pacheco, Strobel, Dorigo. *Real-Time Coordination of a Foraging Robot Swarm
  Using Blockchain Smart Contracts.* ANTS 2022. Foraging, the canonical
  stigmergic task, coordinated through smart contracts.
  <https://link.springer.com/chapter/10.1007/978-3-031-20176-9_16>
- Strobel, Pacheco, Dorigo. *Robot swarms neutralize harmful Byzantine robots
  using a blockchain-based token economy.* Science Robotics 8(79), 2023. Adds an
  economic layer: a token economy in which Byzantine behaviour costs the
  Byzantine robot, so exclusion emerges from incentives. The summary notes the
  work compares indirect (stigmergic) with direct communication.
  <https://www.science.org/doi/10.1126/scirobotics.abm4636>
- *Byzantine Fault Detection in Swarm-SLAM Using Blockchain and Geometric
  Constraints.* ANTS 2024 (authors not confirmed; related to a thesis by
  Moroncelli with Reina). Uses physical consistency constraints as the
  verification oracle for detecting Byzantine contributions to a shared map,
  which is a shared medium.
  <https://dl.acm.org/doi/10.1007/978-3-031-70932-6_4>
- *Toychain: A Simple Blockchain for Research in Swarm Robotics.* arXiv
  2407.06630, 2024. Research tooling for the line above.
- *Blockchain technology for mobile multi-robot systems.* Nature Reviews
  Electrical Engineering, 2024. A review of the whole direction.
  <https://www.nature.com/articles/s44287-024-00034-9>
- *Swarm Oracle: Trustless Blockchain Agreements through Robot Swarms.* arXiv
  2509.15956, 2025. Inverts the relation: the swarm as an oracle for the ledger.

What this direction has established: a BFT-replicated medium does neutralise
Byzantine swarm members in simulation and on hardware, and stigmergic tasks
work on top of it. What it costs: the medium is a global ledger. The papers
frame scalability as an open problem rather than a solved one, and the
comparison paper exists precisely because the consensus layer's cost and
resilience trade against each other.

## Direction 2: attacks on stigmergy, and defences that stay inside stigmergy

- Aswale, López, Ammartayakun, Pinciroli. *Hacking the Colony: On the
  Disruptive Effect of Misleading Pheromone and How to Defend Against It.*
  arXiv 2202.01808, 2022. Introduces "detractors" that lay indistinguishable
  misleading food trails and shows the colony can be starved. The proposed
  defence is a second pheromone type (a cautionary trail) laid by cooperators
  on top of suspicious trails; it limits but does not nullify the attack.
  <https://arxiv.org/abs/2202.01808>
- *Robust Mitigation Strategy for Misleading Pheromone Trails in Foraging Robot
  Swarms.* ANTS 2024 (authors not confirmed). Follows the same threat and
  proposes a stronger mitigation.
  <https://link.springer.com/chapter/10.1007/978-3-031-72062-8_27>
- Reputation-weighted pheromone in networking: *A Multi-Attribute Pheromone Ant
  Secure Routing Algorithm Based on Reputation Value for Sensor Networks*
  (Sensors, 2017) and *AntTrust: An Ant-Inspired Trust Management System for
  Peer-to-Peer Networks* (Sensors, 2022). These weight pheromone by node
  reputation, which is identity binding by another name.

What this direction has established: the deception vulnerability in the
hypothesis is real, has a name (detractors, misleading pheromone), and the
defences that stay purely stigmergic are partial. It also confirms the exact
failure mode: the attack works because the medium cannot tell who wrote a
trace, so one attacker's trace is indistinguishable from a majority's.

## Direction 3: BFT that scales by not talking to everyone

The premise "BFT struggles to scale because of heavy communication" is true for
classical protocols and has been attacked directly for two decades.

- King, Saia and co-authors. *Scalable Byzantine Agreement* and *Breaking the
  O(n²) bit barrier: scalable Byzantine agreement with an adaptive adversary.*
  Probabilistic Byzantine agreement with polylogarithmic messages per
  processor. <https://www.cs.unm.edu/~saia/papers/sba.pdf>
- Rocket, Yin, Sekniqi, van Renesse, Sirer. *Scalable and Probabilistic
  Leaderless BFT Consensus through Metastability.* arXiv 1906.08936, 2019. The
  Snow family: every node repeatedly samples a small random subset of peers,
  and honest nodes are steered to the same outcome with a strong probabilistic
  safety guarantee. Per-node cost is a constant sample size, independent of
  network size. <https://arxiv.org/abs/1906.08936>
- *Scalable and Secure Computation Among Strangers: Resource-Competitive
  Byzantine Protocols.* arXiv 1907.10308. Frames security as a cost ratio: how
  much honest effort the adversary can waste per unit of its own.
- *Communication complexity of byzantine agreement, revisited.* Distributed
  Computing, 2022. Lower and upper bounds for the classical setting.

What this direction has established: the "BFT does not scale" half of the
hypothesis is out of date as a statement about the field. Sampled, probabilistic
BFT with flat per-node cost exists. The interesting move in the
hypothesis is therefore not "make BFT cheaper" but "put the sampling on the
medium and let the medium carry the coordination".

## Direction 4: the medium as the object of formalisation

- *Ledger-State Stigmergy: A Formal Framework for Indirect Coordination
  Grounded in Distributed Ledger State.* arXiv 2604.03997, April 2026 (authors
  not confirmed). Treats a replicated ledger as a stigmergic medium, gives a
  state-transition formalism, names three base coordination patterns
  (state-flag, event-signal, threshold-trigger) plus a commit-reveal overlay,
  and argues that recovery can be built into the medium through staking,
  timeout reversion, claim caps and expiry. The summary is explicit that it does
  not claim measured Byzantine superiority for stigmergy in isolation: any
  advantage belongs to the full mitigation package.
  <https://arxiv.org/abs/2604.03997>
- Heylighen. *Stigmergy as a Universal Coordination Mechanism.* Cognitive
  Systems Research, 2016. The conceptual grounding for "the medium is the
  coordinator". <https://pespmc1.vub.ac.be/Papers/Stigmergy-varieties.pdf>
- Parunak. *Digital Pheromones for Coordination of Unmanned Vehicles.* The
  engineering origin of digital pheromone fields.

This is the closest existing statement of the composition in the hypothesis:
stigmergy where the medium is BFT-replicated state. It is five months old at
the time of this search and framed as vocabulary and design guidance rather
than as a cost and tolerance analysis.

## Direction 5: Byzantine robustness for language-model agent collectives

Relevant because the eventual application is likely fleets of software agents,
not ants.

- *Robust Multi-Agent LLMs under Byzantine Faults.* arXiv 2605.09076, 2026.
  A decentralised filter-and-refine protocol with (F+1)-robustness conditions
  on the communication graph.
- Jo et al. *Byzantine-Robust Decentralized Coordination of LLM Agents.* arXiv
  2507.14928, 2025. Leader-based coordination fails under consecutive malicious
  leaders; costly because each round is a model call.
- *Rethinking the Reliability of Multi-agent System: A Perspective from
  Byzantine.* arXiv 2511.10400, 2025. Quantifies reliability across topologies.
- *CodeCRDT: Observation-Driven Coordination for Multi-Agent LLM Code
  Generation.* arXiv 2510.18893, 2025. Coordination through observed shared
  state, which is stigmergy for code agents, without a Byzantine model.

None of these use the word stigmergy, and none put the coordination in the
medium; they put it in the message graph. The gap between them and Direction 4
is where the hypothesis sits.

## A caution on "scales infinitely"

- Font Llenas, Talamali, Xu, Marshall, Reina. *Testing the limits of pheromone
  stigmergy in high-density robot swarms.* Royal Society Open Science, 2019.
  At high density a simple stigmergic algorithm becomes first no better, then
  worse, than non-interacting random walkers. The medium saturates.
  <https://royalsocietypublishing.org/doi/10.1098/rsos.190225>
- *Congestion and Scalability in Robot Swarms: a Study on Collective Decision
  Making.* arXiv 2307.08568, 2023. Movement and communication congestion limit
  the scalability promise of decentralised systems, stigmergy included.
- *Direct Communication or Stigmergy? Selecting Communication Mechanisms.*
  ALIFE 2025. A decision framework for when each mechanism wins.

Stigmergy's scaling advantage is in the message graph. The medium itself is a
shared resource with its own capacity, contention and, once it is replicated
software state rather than a physical field, its own consistency cost. Any
composition inherits those limits.

## Added after the independent critique

The reviewer named the following as work it was confident exists and that the
first pass missed. Each maps directly onto a design item or a finding.

- Sharded BFT with random committee assignment and shard size chosen so
  capture probability is negligible: Luu et al., *Elastico* (CCS 2016);
  Kokoris-Kogias et al., *OmniLedger* (IEEE S&P 2018); Zamani et al.,
  *RapidChain* (CCS 2018). These are design items 1 to 3 of the memo, and
  cross-shard accounting, the hole the critique found in the model, is their
  central cost.
- Cryptographic sortition for unpredictable committees: Gilad et al.,
  *Algorand* (SOSP 2017).
- Douceur, *The Sybil Attack* (IPTPS 2002). The "identities are scarce by
  fiat" assumption has a canonical treatment and a canonical impossibility.
- Shilling attacks on recommender systems: Lam and Riedl, *Shilling
  recommender systems for fun and profit* (WWW 2004); Mobasher et al.,
  *Toward trustworthy recommender systems* (ACM TOIT 2007). Push and nuke
  attacks are the flood and suppress strategies, and attacks on sparsely rated
  items are the participation-asymmetry attack, stated there as a general
  property of medium-based rating.
- Byzantine-robust aggregation and the per-coordinate weakness of the
  coordinate-wise median: Yin et al. (ICML 2018); Blanchard et al., *Krum*
  (NeurIPS 2017). The per-cue median in the model is a coordinate-wise
  median and inherits the weakness.
- Bracha, *Asynchronous Byzantine agreement protocols* (1987): reliable
  broadcast, which costs more than the model counts for its broadcast row.
- Agreement versus truth: the oracle problem and Schelling-point oracles
  (Buterin, *SchellingCoin*, 2014); Li et al., *A Survey on Truth Discovery*
  (SIGKDD Explorations 2016).
- Kamvar et al., *EigenTrust* (WWW 2003): identity-bound reputation in
  peer-to-peer networks.

## What looks open (at abstract level)

1. **Cost and tolerance on one plane.** The swarm-blockchain line measures
   tolerance with a global ledger; the sampled-BFT line measures cost for
   transactions, not for a coordination medium. A study that keeps the medium
   sampled and local, and reports messages per agent against tolerated
   Byzantine share, was not found.
2. **Verifiable versus unverifiable cues.** Whether the agent can check a cue
   by acting on it changes the problem from Byzantine agreement to Byzantine
   attention allocation. The two regimes appear to be treated by different
   communities and not contrasted.
3. **Participation asymmetry, as a coordination property.** A per-cue
   majority is a majority of whoever wrote about that cue. The recommender
   systems literature states this as the sparse-item shilling attack, so it
   is not open as an attack. What was not found is its treatment as a
   property of a coordination medium where the honest write rate on a cue is
   tied to honest action on that cue, which is what makes the verification
   share the controlling parameter.

Items 2 and 3 were both surfaced by the executable model, not by the search,
and item 3 was then narrowed by the critique. Treat the search as incomplete.
