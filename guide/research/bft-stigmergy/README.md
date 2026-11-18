# Byzantine fault tolerance and stigmergy

Cost figures are nominal honest-traffic costs, excluding adversary-generated
traffic; they do not measure total traffic under attack.

> **EXPERIMENTAL:** a simulation research package, not a runtime design or a
> BFT tolerance guarantee.

This spike studies whether Byzantine fault tolerance and coordination through
shared environmental cues can combine flat per-node message cost with resistance
to deception. The deterministic, dependency-free Node simulator has four protocol
families and five fixed adversary strategies: flood, suppress, split, spread,
and floodall. Hand-picked strategies do not establish an optimal adversary.

## Run

From this directory, run a single case or the sweep:

```sh
node simulate --protocol attested --verify --memory --N 1000 --byz 0.4 --adversary floodall
node simulate --sweep
```

The recorded full sweep takes roughly ten minutes; single runs finish in well
under a second according to [results.md](results.md). `node simulate --help`
lists parameters. Runs are seeded.

Read [results.md](results.md) together with [threat-model.md](threat-model.md):
conclusions depend on parameters, verification, identity scarcity, synchrony,
and other modeled assumptions. The sweep is not regenerated in CI.

[prior-art.md](prior-art.md) is an abstract-level survey, not a full-text review.
[memo.md](memo.md) interprets the evidence;
[critique.md](critique.md) records the independent same-model-family review and response.
