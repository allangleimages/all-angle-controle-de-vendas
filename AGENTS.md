# Custom Agent Rules for ALL ANGLE system

These persistent instructions are loaded by the Google AI Studio agent. You MUST adhere to them at all costs.

## 1. Contrast & Readability Guidelines (CRITICAL)

- **NEVER use low-contrast text and background combinations.**
- **Avoid faint hover colors.**
- **Avoid semi-transparent text on quiet colors** (e.g., avoid `text-indigo-300` on `bg-indigo-500/10` or white text on raw light grey backgrounds).
- **Core actions / buttons must use solid high-contrast backgrounds with explicit white or dark text**:
  - Primary actions: Solid backgrounds (like Indigo-600 or slate-900) with solid bold white text (`text-white font-black`).
  - Delete/Destructive actions: Solid `bg-rose-700 hover:bg-rose-800 text-white font-extrabold` OR if secondary, distinct pink background/border with deep red text (`bg-rose-100 hover:bg-rose-200 border border-rose-300 text-rose-700`).
  - Secondary/Ghost buttons: Must retain a solid readable border (e.g., `border-slate-300 text-slate-700 bg-white hover:bg-slate-50`).
- **Font-weight optimization**: Use `font-bold` or `font-black` for headers and buttons to ensure maximum legibility and tracking.

## 2. Secure Restricted Sync Buttons

- **"Sincronizar Banco de Dados"** or **"Sincronizar Vercel"** features must ONLY be displayed or executed if the authenticated user's email belongs strictly to:
  `info@allangle.com.br` (case-insensitive checks, i.e., `.toLowerCase() === 'info@allangle.com.br'`).
- Do not expose administrative database-reset triggers or force synchronization menus to standard administrators or standard staff users.

## 3. Strict SPA Router Safety

- Maintain deep SPA rewrite settings inside `vercel.json` and ensure that `!isAuthenticated` state acts as a rigid auth-wall blocking access to any admin layout screens. No mock or bypass routes allowed.
