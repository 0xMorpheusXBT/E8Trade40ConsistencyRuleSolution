# `src/lib/e8` — framework-free engine

React is the demo. The terminal should import **these functions**, not the pages.

```
src/lib/e8/
├── engine/          40% identities, planner, attack, full-port, coach
│   ├── consistency.ts
│   ├── plan.ts
│   ├── attack.ts
│   ├── port.ts
│   └── analytics.ts
├── markets/         E8 One catalog, HIP-3 contract, 308-market book
│   ├── catalog.ts
│   ├── limits.ts
│   ├── instruments.ts
│   ├── hl-universe.ts
│   └── e8-book.ts
├── tape/            live HL + Trade.XYZ marks, Trade History net of fees
│   ├── tape.ts
│   ├── tape.server.ts
│   ├── history.ts
│   └── seed.ts
├── state/           zustand desk (demo only — terminal uses its own store)
│   ├── store.ts
│   ├── types.ts
│   ├── use-tape.ts
│   └── use-history-sync.ts
├── format.ts
├── assets.functions.ts
└── index.ts         public barrel
```

Tests sit next to the file they specify. They *are* the spec.

| Spec | File |
| --- | --- |
| Help-center Example A / B, 100K $8k path, 15x BTC lock | `engine/plan.test.ts` |
| Eval sprint / funded lock / Copper 8x / $1.30M cap | `engine/attack.test.ts` |
| Net = profit − fee | `tape/history.test.ts` |
| 227 + 81 = 308 | `markets/hl-universe.test.ts` |
| 15x / 8x / 25x / 5x + $1.30M | `markets/limits.test.ts` |
| Symbol / `xyz:` / NVDA hydrate | `tape/tape.test.ts` |
