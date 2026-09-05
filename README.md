# humoudalmunawer.com

Personal site for Humoud Al Munawer — bilingual (EN/AR), static, package-free.

## Local preview

```bash
python3 -m http.server 8080
# open http://localhost:8080/en/
```

## Structure

- `en/` `ar/` — pages
- `static/` — CSS, JS, portrait, brands
- `fonts/` — Inter + IBM Plex Sans Arabic (local)
- Source Serif 4 / Noto Naskh via Google Fonts

## Deploy

Vercel: Framework Other, output = repo root. Preview first. Do not attach custom domain until cutover approval.

See ../GIT-VERCEL-PLAN.md and ../CUTOVER-CHECKLIST.md in the migration folder.
