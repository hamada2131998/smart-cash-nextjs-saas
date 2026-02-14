# AUTH SETTINGS REQUIRED

To make forgot/reset password flow work correctly on production, configure Supabase Auth settings as follows:

- Site URL:
  - `https://smart-cash-nextjs-saas.vercel.app`

- Redirect URLs must include:
  - `https://smart-cash-nextjs-saas.vercel.app/auth/callback`
  - `https://smart-cash-nextjs-saas.vercel.app/auth/reset-password`

Notes:
- This document is informational only.
- No Supabase settings were modified by code.
