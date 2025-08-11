# MotionX Planner

A lightweight, Motion-inspired weekly planner with automatic task scheduling, fixed events, priorities, and a clean weekly grid.

## Stack
- React + TypeScript (Vite)
- Tailwind CSS

## Local development
```bash
npm install
npm run dev
```
App runs at `http://localhost:5173`.

## Build
```bash
npm run build
npm run preview
```

## Deploy (GitHub + Vercel)
1. Create a new GitHub repository and push the contents of this `motionx-planner/` folder as the root:
   ```bash
   cd motionx-planner
   git init
   git add .
   git commit -m "Initial commit: MotionX Planner"
   git branch -M main
   git remote add origin <your_github_repo_url>
   git push -u origin main
   ```
2. Import the repository in Vercel. Settings auto-detect Vite:
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. The included `vercel.json` routes all paths to `/index.html` for SPA routing.

## Scripts
- `dev`: start Vite dev server
- `build`: type-check and build
- `preview`: preview production build locally

