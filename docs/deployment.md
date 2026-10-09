# Deployment and SPA routing

This is a client-side React application. The server must return the built `index.html` for application routes such as `/cases/case-001`; otherwise refreshing a nested route will produce a server-side 404 before React can load.

## Vercel

`vercel.json` contains the rewrite:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

## Netlify

`public/_redirects` contains:

```text
/* /index.html 200
```

## GitHub Pages

`public/404.html` preserves the requested route and redirects it through the application entry point. Set the Vite base path when building a project site:

```text
VITE_BASE_PATH=/SIH_DEMO/
```

The value must match the repository/project-site path. For a custom domain or a root-domain deployment, keep `VITE_BASE_PATH=/`.

After changing the base path, run:

```bash
npm run build
```

Deploy the contents of `dist/`, including `404.html`, `_redirects` where supported, and the generated `assets/` directory.
