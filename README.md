# Cheerio URL reflection proof

Source commit: [`770847685e943c195cf6c4a6fe9aab1748f9b1b8`](https://github.com/jipeng6036-del/cheerio/commit/770847685e943c195cf6c4a6fe9aab1748f9b1b8).

Based on [cheeriojs/cheerio#5385](https://github.com/cheeriojs/cheerio/pull/5385).
Vojta Holes's two original commits keep their authorship and `cherry-pick -x` source hashes. The new commit adds absolute head-base handling without a caller URL and raw-value fallbacks on URL parsing failure.

`validation-summary.json` binds the original and additional changes to exact commits and records the completed local checks. `runtime-*.json` preserves 118 exported-API fixture results for each source. The original-patch comparison is its two implementation commits applied to the same current upstream, not an assertion that an old dependency environment was rerun. Only local source-path metadata was made portable in the published reports.

From each source checkout after `npm ci`, run this file with the same Node version:

```sh
node --import ./node_modules/tsx/dist/loader.mjs /path/to/public-runtime-proof.mts candidate ./src/index.ts report.json
```

Use `baseline` and `original` instead of `candidate` to record the expected failures in those source checkouts. The baseline is `84fd02e80edf9ca4d9f66f042868cd3571fac19e`; the applied original patch is `aedcc2b9f8193047ab5c5335fe111ce71eb177f0`.

For package verification, run `npm run build`, then `npm pack`; install that tarball in a clean directory, copy the two `installed-consumer` files there, and run both with Node. They perform actual file reads and HTTP redirect requests against an owned loopback server, then close it. They do not call external models or services.

This change searches direct children of `<head>` only. It does not implement body/nested-base lookup or claim full browser conformance. The upstream hosted CI and maintainer review are separate from the completed local checks.
