# TikTokMiniApp Gallery

TikTokMiniApp is a portfolio-style mini app hub. Public users can view, search, filter, and open apps. The app does not run mini apps internally.

## Source Of Truth

The production registry lives in:

```text
public/apps.json
```

Vite copies this file to `dist/apps.json`, so production can load it with `fetch("/apps.json")`.

Each app object uses:

```json
{
  "id": "abcmyanh",
  "name": "ABCMYANH",
  "description": "Mini app học chữ cái và số cho trẻ em.",
  "category": "education",
  "icon": "📚",
  "liveUrl": "https://abcmyanh.vercel.app/",
  "githubUrl": "https://github.com/vinhduyetweb-debug/ABCMYANH",
  "status": "live",
  "source": "default",
  "editable": false
}
```

TikTokMiniApp itself is intentionally excluded from the rendered list. The frontend loads the registry dynamically with `fetch("/apps.json")`.

## Admin Add App

Add App is hidden by default. Open the site with:

```text
?admin=1
```

Then click `Admin Login` and enter the admin secret. After `/api/admin` verifies the secret, the `Add App` button appears.

The frontend never asks for, stores, or sends a GitHub token. GitHub writes happen only through the Vercel serverless API.

## Serverless API

- `POST /api/admin`: verifies the admin secret.
- `GET /api/apps`: returns the current app registry.
- `POST /api/apps`: appends a new app to `public/apps.json` in GitHub.
- `DELETE /api/apps`: deletes only `source: "user"` and `editable: true` apps.

Required Vercel Environment Variables:

```text
ADMIN_SECRET=your-admin-secret
GITHUB_TOKEN=github-token-with-contents-write-access
```

Optional Vercel Environment Variables:

```text
GITHUB_OWNER=vinhduyetweb-debug
GITHUB_REPO=tiktokminiapp
GITHUB_BRANCH=main
GITHUB_APPS_PATH=public/apps.json
```

## Rendering

Cards show:

- icon
- app name
- description
- category and status badges
- Open App button
- GitHub button when available
- Delete button only after admin login for editable user apps

Search and category filters are client-side.

## Setup

```bash
npm install
```

## Development

```bash
npm run dev
```

For local API testing, provide env vars through your local Vercel/dev environment.

## Build

```bash
npm run build
```

## Deploy

Deploy to Vercel with:

```bash
npm run build
```

Set `ADMIN_SECRET` and `GITHUB_TOKEN` in Vercel project settings before using Add App in production.
