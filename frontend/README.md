# Passe · Frontend

React + TypeScript + Vite, Tailwind CSS 4 e componentes acessíveis com Radix UI no padrão shadcn/ui.

## Desenvolvimento

```bash
npm install
cp .env.example .env
npm run dev
```

`VITE_API_URL` deve apontar para a base da API, incluindo `/api/v1`. Por exemplo: `http://localhost:4000/api/v1`.

## Comandos

```bash
npm run lint
npm run build
```

No Vercel, use `frontend` como diretório raiz e configure `VITE_API_URL` com a URL pública da API mais `/api/v1`. Consulte o [README da raiz](../README.md) para o fluxo completo local e CI/CD.
