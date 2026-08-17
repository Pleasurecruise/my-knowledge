# Frozen offline evaluation

This synthetic version-3 corpus covers four Chinese writing domains, tag reuse/new-leaf limits,
duplicate/near/related/unrelated decisions, and answerable/unanswerable grounded answers.
`baseline.json` retains the Chinese output from the former multilingual pipeline; `candidate.json`
retains the Chinese-only pipeline output. `evaluate.ts` validates and scores both instead of trusting
hand-written summary values.

The deterministic summary measures schema success, tag compliance and reuse, duplicate
precision/recall, citation precision, unsupported-claim rate, refusal correctness, and hard invariant
failures. Translation is intentionally absent from the candidate pipeline. Candidate latency and cost
remain `null`: they require an opt-in live Gateway run with real account metadata and must not be
invented from synthetic fixtures.

The corpus contains no production conversation or provider trace. Long-form Chinese prose quality
still requires blinded owner review; deterministic structure scores cannot approve writing quality or
provider retention policy.
