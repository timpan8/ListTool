# Kickoff prompt (paste into Claude Code as the first message)

```
Read CLAUDE.md, SPEC.md and PLAN.md in this repository before writing any code.

Confirm these defaults with me first (one short message, then wait):
1. Repo name is `list-tool` → Vite `base: '/list-tool/'`
   (a user site or custom domain would use base '/').
2. Default name order for the Recipients parser: Last First.
3. Default sort locale: Swedish (sv), natural/numeric sort on.
4. XLSX export is "Later"; CSV/TSV is enough for now.
5. Recipes are Phase 2 (milestone 6).

Then implement Milestone 1 ONLY (see PLAN.md) and stop for my review.

Working rules for every milestone:
- Follow the contracts in CLAUDE.md exactly. Parsers, tools and exporters are single
  modules registered in typed registries; the shell is generic and is never edited to
  add one. If you feel the need to special-case the shell, stop and tell me instead.
- Strict TypeScript, no `any`, pure functions for all parse/run/render/compare logic,
  a Vitest test next to every module, fixtures from SPEC §4 (including the exact Outlook
  example and Swedish characters).
- Before you report a milestone as done, run `npm run typecheck`, `npm test` and
  `npm run build`. Never claim a check passed unless you actually ran it. If you cannot
  verify something in a browser, say so.
- No backend, no accounts, no analytics, no data leaving the browser, no CDN assets,
  no placeholder buttons for unbuilt features, no unrelated refactors.
- End each milestone with a short summary: what was built, what was verified, what's next.
```

## vite.config.ts (for reference)
```ts
import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  base: '/list-tool/', // project site at https://<user>.github.io/list-tool/ — use '/' for a user site or custom domain
});
```
