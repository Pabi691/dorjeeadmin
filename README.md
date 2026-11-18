# Dorjee Fashion Factory — Admin CRM

Next.js 14 admin panel for **admin.dorjeefashionfactory.com**. Static export
(`output: "export"`), so `npm run build` writes plain HTML/CSS/JS to `out/`.
This repo holds the CRM only; the API lives on `api.dorjeefashionfactory.com`.

## Deploy (Hostinger)
- **Branch `main`** = source. **Branch `deploy`** = built `out/` (what Hostinger serves).
- Hostinger GIT → public URL `https://github.com/Pabi691/dorjeeadmin.git`,
  **branch `deploy`**, directory `public_html/admin`. No build/rewrite rules needed
  (`trailingSlash: true` gives every route its own index.html).

## Config
`.env.production` → `NEXT_PUBLIC_API_URL=https://api.dorjeefashionfactory.com`

## Local dev
```
npm install
npm run dev     # http://localhost:3002
```
