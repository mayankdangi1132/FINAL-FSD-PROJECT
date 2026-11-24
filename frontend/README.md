# Saffron Table — Frontend (React + Vite)

This is the React app of the Saffron Table MERN project. It talks to the Express API in `../backend`
(Vite forwards `/api` and `/uploads` to `http://localhost:5050` during development).

Run the whole project from the parent folder — see `../README.md`:

```bash
npm install
npm run dev
```

Key files: `src/api.js` (fetch wrapper that adds the JWT), `src/context/AppContext.jsx` (app state, API calls,
live polling), `src/components/Layouts.jsx` (route guards), `src/components/ThemeToggle.jsx` (light / dark mode),
`src/styles/base.css` (design tokens and the dark theme).
