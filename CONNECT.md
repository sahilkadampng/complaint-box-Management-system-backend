Local connection notes

1) Start the backend API (in the backend repository):
   - Open a terminal and run:
     cd "c:\complaint box-2 - Copy backend\server"
     npm install
     npm run dev
   - Backend default port: 3000

2) Start the frontend (Vite dev server):
   - Open another terminal and run:
     cd "c:\complaint box-2\complaint-box4"
     npm install
     npm run dev
   - Frontend default port: 5173

3) How requests are routed
   - The frontend `src/lib/api.ts` uses `import.meta.env.VITE_API_URL || '/api'`.
   - Vite dev server is configured to proxy `/api` to `http://localhost:3000` (see `vite.config.ts`).
   - You can also set `VITE_API_URL` in `.env.development` to `http://localhost:3000/api` to bypass the proxy.

4) CORS and auth
   - Backend uses `CORS_ORIGIN` (default: `http://localhost:5173`). If you run the frontend from a different origin, set that env var in the backend `.env`.
   - Auth uses JWT in the Authorization header (saved in `localStorage`), so no cookies by default.

5) Quick test
   - With both servers running, open the browser to `http://localhost:5173` and try to login or call `/api/health`:
     - `GET http://localhost:5173/api/health` (proxied → `http://localhost:3000/api/health`)

If you want, I can add a small runtime console log of `API_BASE_URL` in `src/lib/api.ts` for debugging or add `credentials: 'include'` if you switch to cookie-based auth.