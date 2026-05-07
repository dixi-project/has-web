# Human Aging Simulators — `has-web`

[Español](#español) · [English](#english)

---

## Español

**Human Aging Simulators (HAS)** es un laboratorio digital abierto que modela el envejecimiento humano usando datos sintéticos y ciencia abierta.

Este repositorio contiene **`has-web`**: el frontend público (landing, donaciones, lista de espera de ciencia ciudadana, transparencia).

### Stack

- [Next.js 16](https://nextjs.org) (App Router) con `output: "export"` (sitio 100% estático)
- [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS 4](https://tailwindcss.com)
- [next-intl 4](https://next-intl.dev) para i18n (ES, EN)
- [pnpm](https://pnpm.io) como package manager

### Comenzar

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

Rutas:

- `/` → redirección al idioma del navegador (ES o EN)
- `/en/` → home en inglés
- `/es/` → home en español

### Comandos útiles

```bash
pnpm dev            # servidor de desarrollo
pnpm build          # build estático en `out/`
pnpm lint           # ESLint
pnpm format         # formatea con Prettier
pnpm format:check   # valida formato (CI)
```

### Estructura

```
src/
  app/
    [locale]/         Rutas internacionalizadas (es, en)
    globals.css       Estilos Tailwind globales
  i18n/
    routing.ts        Locales soportados y default
    request.ts        Configuración de mensajes por request
    navigation.ts     Helpers Link/redirect tipados
messages/             Catálogos de traducción por idioma
  en.json
  es.json
public/
  index.html          Redirect del root al idioma del navegador
```

### Política de internacionalización

URLs con prefijo de idioma obligatorio. Detección por `navigator.language` en root. `hreflang` y `canonical` en cada página. Traducciones server-side, sin strings hardcodeados en componentes. Detalle completo en `../00-governance/policies/i18n-policy.md`.

### Disclaimer

HAS **no es un dispositivo médico**. Sólo con fines educativos y de investigación. No utilizar para diagnóstico ni tratamiento. Ver ADR-008.

### Documentación del proyecto

El framework de specs (SDD) vive en el directorio padre `sys_has/`:

- Visión: `../00-master-spec.md`
- Roadmap: `../16-product/roadmap.md`
- Plan Fase 1: `../tasks/backlog/001-PHASE-1-implementation-plan.md`
- ADRs: `../09-architecture/adr/`

### Licencia

MIT.

---

## English

**Human Aging Simulators (HAS)** is an open digital lab modeling human aging with synthetic data and open science.

This repository contains **`has-web`**: the public frontend (landing, donations, citizen science waitlist, transparency).

### Stack

- [Next.js 16](https://nextjs.org) (App Router) with `output: "export"` (fully static site)
- [TypeScript](https://www.typescriptlang.org)
- [Tailwind CSS 4](https://tailwindcss.com)
- [next-intl 4](https://next-intl.dev) for i18n (ES, EN)
- [pnpm](https://pnpm.io) as the package manager

### Getting started

```bash
pnpm install
pnpm dev          # http://localhost:3000
```

Routes:

- `/` → redirects to the user's browser locale (ES or EN)
- `/en/` → English home
- `/es/` → Spanish home

### Useful commands

```bash
pnpm dev            # dev server
pnpm build          # static build into `out/`
pnpm lint           # ESLint
pnpm format         # format with Prettier
pnpm format:check   # validate formatting (CI)
```

### Layout

```
src/
  app/
    [locale]/         Internationalized routes (es, en)
    globals.css       Global Tailwind styles
  i18n/
    routing.ts        Supported locales and default
    request.ts        Per-request messages config
    navigation.ts     Typed Link/redirect helpers
messages/             Translation catalogs per locale
  en.json
  es.json
public/
  index.html          Root redirect to the browser locale
```

### Internationalization policy

Locale-prefixed URLs are mandatory. Detection happens via `navigator.language` at the root. `hreflang` and `canonical` are present on every page. Translations are server-rendered; no hardcoded strings in components. Full policy in `../00-governance/policies/i18n-policy.md`.

### Disclaimer

HAS **is not a medical device**. Educational and research purposes only. Do not use for diagnosis or treatment. See ADR-008.

### Project documentation

The SDD spec framework lives in the parent directory `sys_has/`:

- Vision: `../00-master-spec.md`
- Roadmap: `../16-product/roadmap.md`
- Phase 1 plan: `../tasks/backlog/001-PHASE-1-implementation-plan.md`
- ADRs: `../09-architecture/adr/`

### License

MIT.
