# CLAUDE.md - Fairday Engine Room (Admin Dashboard)

This file provides strict architectural rules and boundaries for Claude Code when working in the `fairday-engine-room` repository.

## 🚨 CRITICAL GIT WORKFLOW RULES (DO NOT IGNORE) 🚨
- **NEVER work directly on the `main` or `staging` branches.** 
- **NEVER push directly to `main` (`git push origin main`).**
- **The exact required workflow is:**
  1. Create a feature branch (`git checkout -b feat/your-feature-name`).
  2. Write your code and commit your changes.
  3. Push the feature branch to GitHub (`git push origin feat/your-feature-name`).
  4. Checkout `staging`, merge your feature branch (`git merge feat/your-feature-name`), and push to staging (`git push origin staging`) to trigger the automated CI/CD deployment.
  5. Wait for the user to manually verify the Staging deployment URL.
  6. ONLY when the user explicitly says "Staging looks good, deploy to Prod", checkout `main`, merge `staging`, and push to `main` (`git push origin main`).

## 🚨 ARCHITECTURE & SECURITY RULES 🚨

### 1. API Logic (`src/lib/api.ts`)
- **CRITICAL RULE:** Always use the pre-configured `api` instance from `@/lib/api` instead of importing raw `axios`. The shared instance handles authentication cookies automatically.
- Do not attempt to bypass this rule. The ESLint AST configuration will throw a fatal error and block the commit if you import `axios` directly in any React component.

### 2. State Management
- Currently, state is managed locally via React hooks (`useState`, `useMemo`).
- If a new feature requires sharing state across multiple pages, you must propose introducing Zustand before proceeding.

### 3. UI & Styling (Tailwind CSS)
- The app uses a utility-first styling approach with Tailwind CSS v4.
- Use the `cn()` utility (`clsx` + `tailwind-merge`) from `src/lib/utils.ts` when merging conditional classes.

### 4. Routing
- The application uses React Router v7.
- Note the `basename='/engine-room'` in `src/App.tsx`. All absolute paths must account for this sub-path if deployed alongside other assets.
