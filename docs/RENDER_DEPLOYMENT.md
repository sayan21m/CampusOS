# CampusOS API on Render

Deploy the **backend only** from this GitHub repository. The database is hosted Neon (already migrated). The React app is not part of this Render service.

Do not put `.env`, `.env.neon`, or connection strings in Git. Set secrets in the Render dashboard.

## Render Web Service

| Setting           | Value                                           |
| ----------------- | ----------------------------------------------- |
| Repository        | `sayan21m/CampusOS`                             |
| Branch            | `develop` (or `main` if you release from there) |
| Root directory    | repository root (`.`) — leave blank             |
| Runtime           | Node                                            |
| Node version      | `22.x` (`package.json` `engines`)               |
| Build command     | `npm ci --include=dev && npm run build`         |
| Start command     | `npm start`                                     |
| Health check path | `/health`                                       |
| Instance          | Free or Starter                                 |

`--include=dev` is required so the Prisma **CLI** (a devDependency) can run `prisma generate` during build. `npm run build` is `prisma generate`. `npm start` is `node apps/backend/src/index.js`.

The process listens on `process.env.PORT` (Render sets this) and `0.0.0.0`.

## Environment variables

Configure these in **Render → your service → Environment**.

| Name             | Required          | Purpose                                                                                                                                                                   |
| ---------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`   | Yes               | Neon **direct** Postgres URL (`sslmode=require`). Not the pooler URL.                                                                                                     |
| `JWT_SECRET`     | Yes               | Long random secret for access tokens. Use Render “Generate”.                                                                                                              |
| `FRONTEND_URL`   | Yes in production | Browser origin(s) allowed by CORS. Example: `https://your-app.vercel.app`. Comma-separated list is supported. The **first** origin is used in password-reset email links. |
| `NODE_ENV`       | Recommended       | `production`                                                                                                                                                              |
| `PORT`           | No                | Render injects this. Do not override unless you know you need to.                                                                                                         |
| `RESEND_API_KEY` | No                | Outbound email. If unset, mail is skipped (login still works).                                                                                                            |
| `MAIL_FROM`      | If sending mail   | Example: `CampusOS <noreply@yourdomain>`                                                                                                                                  |

Local Docker Compose and local `.env` are unchanged. Render does not read `.env.neon`; paste the same Neon URL into `DATABASE_URL` on Render.

### Connecting to Neon

1. Neon console → your project → **Connection details**.
2. Copy the **direct** connection string (host should **not** contain `pooler`; port should **not** be `6543`).
3. Ensure the query string includes `sslmode=require`.
4. Paste it into Render `DATABASE_URL`.
5. Do not run `migrate reset` or `db push`. Migrations are already applied.

## CORS / Vercel frontend

Local origins are always allowed:

- `http://localhost:5173`
- `http://127.0.0.1:5173`
- `http://localhost:8080`
- `http://127.0.0.1:8080`

For production, set `FRONTEND_URL` to the Vercel origin, for example:

```text
FRONTEND_URL=https://campus-os-gilt.vercel.app
```

`https://campus-os-gilt.vercel.app` is also allowlisted in code so a missing `FRONTEND_URL` no longer 500s the live frontend. Still set the env var so password-reset emails use the right host. Unknown origins are rejected without throwing (no Express 500).

If you also use a custom domain:

```text
FRONTEND_URL=https://campus.yourcollege.edu,https://your-app.vercel.app
```

On the Vercel project, set `VITE_API_URL` to `https://<your-render-service>.onrender.com/api/v1` and redeploy the frontend so the value is baked into the build.

## Deploy and test

After the first successful deploy, Render gives a URL like `https://campusos-api.onrender.com`.

```bash
# Liveness (no secrets)
curl https://<your-service>.onrender.com/health
# Expect: {"status":"ok"} and HTTP 200

curl https://<your-service>.onrender.com/
# Expect: CampusOS Backend Running

# Login (Neon has no seed users unless you created them there)
curl -X POST https://<your-service>.onrender.com/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"<your-user>@...","password":"<password>"}'

# JWT-protected route
curl https://<your-service>.onrender.com/api/v1/notices \
  -H 'Authorization: Bearer <token-from-login>'
```

Unauthenticated `/api/v1/notices` should return **401**. A browser call from an origin **not** in `FRONTEND_URL` is blocked by CORS.

## Free-tier limitations

- **Sleep:** The free web service spins down after idle time. The first request can take 30–60+ seconds. Neon can also cold-start.
- **Ephemeral disk:** Notes, notice attachments, submissions, and profile photos are stored under `apps/backend/storage` on the local filesystem. That disk is **wiped on every deploy and is not shared across instances**. Do not rely on Render free disk for production files; use object storage later if you need durable uploads.
- **No Docker Compose on this service:** Render runs Node from the repo root. Postgres is Neon, not the Compose `postgres` container.
- **Do not expose** local `.env` or `.env.neon` in the dashboard logs.

## GitHub checklist

1. Commit the Render files (`render.yaml`, `docs/RENDER_DEPLOYMENT.md`, `/health`, `npm run build`) and push to GitHub.
2. In [Render](https://dashboard.render.com): **New → Web Service → Connect `sayan21m/CampusOS`**.
3. Set root directory blank, build/start commands as in the table above (or apply `render.yaml`).
4. Add `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_URL` (and optional Resend vars).
5. Deploy. Confirm `/health` returns 200.
6. Point the Vercel frontend `VITE_API_URL` at the Render API `/api/v1` and redeploy the frontend.
