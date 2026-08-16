# Performance verification

Use for changes whose purpose or risk involves latency, CPU, memory, bundle size, query count, or
Cloudflare usage.

1. Define the metric, fixture, runtime, warm-up, sample count, and acceptable threshold before editing.
2. Record a baseline and retain raw measurements.
3. Change one relevant variable where practical.
4. Repeat under the same conditions and report median plus meaningful tail behavior.
5. Check correctness, privacy, and resource usage so a faster result is not a behavioral regression.

Synthetic results are labeled as synthetic. Do not generalize a local benchmark into a Cloudflare
production claim.
