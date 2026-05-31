# TikTokMiniApp Platform Architecture

## Purpose

TikTokMiniApp is a portfolio-style hub. It lists external mini apps and opens their live Vercel deployments or GitHub repositories. It does not execute mini apps internally.

## Registry

`src/data/apps.js` is the production gallery source. The frontend imports the bundled app array directly, so rendering does not depend on runtime JSON fetching.

`public/apps.json` can remain as a copy/source artifact for the admin API workflow.

App object shape:

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

## Admin Add App

Public users can only view, search, filter, open apps, and open GitHub links.

Admin flow:

1. Open the app with `?admin=1`.
2. Click `Admin Login`.
3. Submit the admin secret to `POST /api/admin`.
4. After validation, the frontend shows `Add App`.
5. Add App submits to `POST /api/apps`.
6. The serverless API validates input and commits `public/apps.json` to GitHub.

## Security

- `GITHUB_TOKEN` is read only by Vercel serverless functions.
- The frontend never contains, requests, stores, or sends a GitHub token.
- `ADMIN_SECRET` is stored in Vercel Environment Variables.
- Write endpoints require the `x-admin-secret` header.
- Live URLs must be `https://*.vercel.app`.
- GitHub URLs, when provided, must be `https://github.com/...`.
- UI rendering uses DOM APIs and `textContent` rather than HTML string injection.

## API

- `GET /api/apps`: returns current registry.
- `POST /api/admin`: verifies admin secret.
- `POST /api/apps`: appends a user app to GitHub registry.
- `DELETE /api/apps`: removes only `source: "user"` and `editable: true` apps.
