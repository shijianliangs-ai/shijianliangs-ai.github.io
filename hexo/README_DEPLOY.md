# Hexo blog – local preview & deploy notes

This project uses **pnpm** (recommended). `npm i` may fail on newer Node/npm combinations (seen on Node 22 + npm 10).

## Prereqs
- Node.js (recommended: **Node 20 LTS**; Node 22 works when using pnpm)
- pnpm via Corepack

Enable pnpm:
```bash
corepack enable
```

## Install
```bash
pnpm i
```

## Local preview
```bash
npx hexo clean
npx hexo s
```

If port 4000 is occupied:
```bash
npx hexo s -p 4001
```

## Build (generate static files)
```bash
npx hexo clean
npx hexo g
```

Output is in `public/`.

## Server (nginx static)
Point nginx to the generated `public/` directory (or sync `public/` to your web root) and reload nginx after updates.
