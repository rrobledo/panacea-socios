# Panacea Socios

Frontend React para gestión de socios y ventas de Panacea.

## Requisitos

- Node.js 18+
- npm

## Inicio rápido

```bash
npm install
npm run dev
```

La app queda disponible en `http://localhost:5173`.

## Variables de entorno

Copiá `.env.example` como `.env.local` y completá los valores:

```bash
cp .env.example .env.local
```

| Variable | Descripción | Ejemplo |
|---|---|---|
| `VITE_BACKEND_API_URL` | URL base del backend | `https://panacea-socios-backend.vercel.app` |
| `VITE_APP_NAME` | Nombre de la app (opcional) | `Panacea Socios` |

> `.env` contiene los valores de producción y está commiteado.  
> `.env.local` sobreescribe esos valores localmente y está en `.gitignore`.

## Autenticación

El login usa Google OAuth a través del backend (Authorization Code Flow).

**Flujo:**

1. El usuario hace clic en "Iniciar sesión con Google".
2. El frontend redirige a `VITE_BACKEND_API_URL/auth/google`.
3. El backend redirige a Google y maneja el callback.
4. Google redirige de vuelta al backend, que emite un JWT propio.
5. El backend redirige al frontend a `/auth/callback?token=...&socio_id=...`.
6. El frontend guarda el JWT en `localStorage` bajo la clave `panacea_auth`.

**Requisito en el backend:** la variable `FRONTEND_URL` debe apuntar a la URL del frontend con el path `/auth/callback`, por ejemplo:

```
FRONTEND_URL=http://localhost:5173/auth/callback
```

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con HMR |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Previsualización del build |
| `npm run lint` | Linting con ESLint |
