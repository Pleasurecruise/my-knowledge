# Model and retrieval evaluation

Use for model, provider, prompt, skill, embedding, threshold, tag-generation, translation, retrieval,
or grounded-answer changes.

1. Freeze an approved or synthetic corpus, expected invariants, baseline, candidate, and model settings.
2. Run both variants on the same examples and retain per-example results.
3. Measure schema success, tag reuse, translation preservation, duplicate precision/recall, citation
   precision, refusal correctness, latency, and cost as applicable.
4. Reject any candidate that regresses privacy, authorization, schema, or citation validity.
5. Use blinded owner review for prose quality that deterministic metrics cannot represent.

This is offline A/B evaluation, not production traffic splitting. Never add production conversations
or full provider traces to the corpus.
