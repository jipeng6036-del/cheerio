# Invalid caller URL review follow-up

Source: [`e9471f504c86b1b57aafc06426b57329f544e464`](https://github.com/jipeng6036-del/cheerio/commit/e9471f504c86b1b57aafc06426b57329f544e464), parent `770847685e943c195cf6c4a6fe9aab1748f9b1b8`.

This addresses cubic comments 4410011966 and 4410011987 on Cheerio #5696. A malformed caller `baseURI` no longer discards an otherwise valid absolute head base. The same first base is retried on its own only after fallback-based parsing fails, preserving same-scheme relative parsing and the no-second-base rule. The original author's two commits remain in history.

The expanded public loader proof runs the same204cases before and after:128pass/76fail at the parent,204pass/0fail after. Each run used the same checkout at a different time, bound to its own frozen125-file manifest and archive. It did not use different source paths. The old report metadata saying otherwise was corrected only in these derived public reports; every case input, expected/actual result, error, count and timestamp is unchanged. Raw and public SHA256 values are in `validation-summary.json`. The parent runner's exit0 records expected failures and is not a passing product result.

Replay from the relevant source checkout after `npm ci`:

```sh
node --import ./node_modules/tsx/dist/loader.mjs /path/to/public-runtime-proof.mts candidate ./src/index.ts report.json
```

Use `before` at the parent commit to record the negative control. Build and pack the fixed source, install its tarball in a clean consumer, and run `installed-consumer.cjs` and `.mjs` there. They perform actual fixture reads and loopback HTTP redirect/fromURL requests and close the owned server. There are no mocked transports or paid/model calls.

The Linux Node22/24/currentLTS matrix, LTS coverage, root build, website build/check and full lint passed; Windows869tests and configured type checks passed. Exact Linux commands, environment and raw check logs are the `linux-*` files; nonblocking build/lint diagnostics are preserved. Local checks do not claim upstream CI approval, human review or merge.

Greptile's repeated-head-scan concern is real and explicitly nonblocking. Large-head performance is not ruled out by the earlier head-size0/1 measurements. This fix introduces no cache or browser-conformance claim.
