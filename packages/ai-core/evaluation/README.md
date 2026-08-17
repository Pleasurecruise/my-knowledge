# Frozen offline evaluation

This synthetic version-2 corpus covers four writing domains, tag reuse/new-leaf limits, English and
Japanese translation structure, duplicate/near/related/unrelated decisions, and
answerable/unanswerable grounded answers. `baseline.json` and `candidate.json` retain per-example
outputs; `evaluate.ts` validates and scores them instead of trusting hand-written summary values.

The deterministic summary measures schema success, tag compliance and reuse, translation structure,
duplicate precision/recall, citation precision, unsupported-claim rate, refusal correctness, and hard
invariant failures. Candidate latency and cost remain `null`: they require an opt-in live Gateway run
with real account metadata and must not be invented from synthetic fixtures.

The corpus contains no production conversation or provider trace. Japanese and long-form prose
quality still require blinded owner review; deterministic structure scores cannot approve writing
quality or provider retention policy.
