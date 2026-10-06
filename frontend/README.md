# RetailIQ frontend

React 19 + TypeScript + Vite single-page app for the RetailIQ promotion analyst.
See the [root README](../README.md) for running the whole project.

```bash
npm ci
npm run dev      # http://localhost:5173, proxies /api (REST + WebSocket) to the backend on :8000
npm run build    # production build into dist/, served by the FastAPI backend
npm run lint
```

| File | Purpose |
|---|---|
| `src/App.tsx` | Screen routing (login, menu, promotion library, chat, conversations, refresh) |
| `src/api.ts` | REST client; attaches the JWT and handles 401s |
| `src/useConversationSocket.ts` | WebSocket chat protocol (`history`, `message`, `error` events) |
| `src/FormattedMessage.tsx` | Dependency-free markdown renderer for agent answers |
| `src/config.ts` | Backend location (page origin, or `VITE_API_BASE_URL`) |
