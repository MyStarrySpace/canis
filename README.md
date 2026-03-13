# CANIS

**Causal Analysis Network for Interactive Systems** — a Rust/WASM graph layout engine with a TypeScript API and optional React bindings.

## Prerequisites

- [Rust](https://rustup.rs/) with `wasm32-unknown-unknown` target
- [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/)
- Node.js 18+

## Setup

```bash
npm install
```

## Development

Start the Vite demo app on port 3333:

```bash
npm run dev
```

Open http://localhost:3333

## Build

Full build (WASM + TypeScript + copy artifacts):

```bash
npm run build
```

Individual steps:

```bash
npm run build:wasm       # Compile Rust to WASM via wasm-pack
npm run build:ts         # Bundle TypeScript with tsup
npm run build:copy-wasm  # Copy .wasm into dist/
```

## Test

```bash
npm test            # TypeScript tests (vitest)
npm run test:wasm   # Rust/WASM tests (wasm-pack)
```

## Package Exports

| Export | Path | Description |
|--------|------|-------------|
| `@untangling/canis` | `dist/index.js` | Core engine API |
| `@untangling/canis/react` | `dist/react.js` | React hooks and components |
| `@untangling/canis/worker` | `dist/worker.js` | Web Worker entry point |
