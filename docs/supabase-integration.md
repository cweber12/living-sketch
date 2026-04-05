# Supabase Integration

## Purpose

This document describes how the application connects to and uses Supabase for authentication and file storage. It covers client factory patterns, the auth session flow, storage bucket structure, API route conventions, and Row Level Security (RLS).

---

## Client Factories

There are four Supabase client factories, each for a distinct context.

| Factory           | File                         | Key used                          | When to use                                             |
| ----------------- | ---------------------------- | --------------------------------- | ------------------------------------------------------- |
| `createClient()`  | `lib/supabase/client.ts`     | Publishable key (`NEXT_PUBLIC_*`) | Browser components (read-only ops, session access)      |
| `createClient()`  | `lib/supabase/server.ts`     | Publishable key (`NEXT_PUBLIC_*`) | Server Components and API Routes (user identity checks) |
| `supabaseAdmin`   | `lib/supabase/admin.ts`      | Service role key (`SUPABASE_*`)   | Server-only API Routes that write to storage            |
| `updateSession()` | `lib/supabase/middleware.ts` | Publishable key (`NEXT_PUBLIC_*`) | `middleware.ts` only — session refresh between requests |

### Notes on `supabaseAdmin`

- The admin client is a singleton, not a per-request factory.
- It is `null` when `SUPABASE_SERVICE_ROLE_KEY` is not set, so callers must use the fallback pattern: `const client = supabaseAdmin ?? supabase;`
- It bypasses RLS, so it can list and write files to any bucket without an active user session.
- The service role key must never be prefixed with `NEXT_PUBLIC_` and must never be used in client-side code.

---

## Environment Variables

| Variable                                       | Used by                     | Required    |
| ---------------------------------------------- | --------------------------- | ----------- |
| `NEXT_PUBLIC_SUPABASE_URL`                     | All clients                 | Yes         |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` | Browser, server, middleware | Yes         |
| `SUPABASE_SERVICE_ROLE_KEY`                    | Admin client only           | Recommended |

---

## Authentication Flow

Authentication uses `@supabase/ssr` with cookie-based sessions. There is no JWT stored in localStorage.

### Session Lifecycle

```
Browser request
  → middleware.ts: updateSession()           reads cookies, calls auth.getUser()
  → if no user && not public path → redirect to /login
  → if user present → NextResponse.next() with refreshed session cookies
```

`updateSession` must call `supabase.auth.getUser()` immediately after `createServerClient` — no code in between — to avoid session lookup bugs.

### Login / Register / Logout (`app/actions/auth.ts`)

All auth actions are Next.js Server Actions:

```typescript
// Login
supabase.auth.signInWithPassword({ email, password });
// on error → redirect('/login?error=...')
// on success → redirect('/')

// Register
supabase.auth.signUp({ email, password });
// on success → redirect('/login?message=Check your email...')

// Logout
supabase.auth.signOut();
// → redirect('/login')
```

### Auth Callback (`app/auth/callback/route.ts`)

Handles the OAuth/email confirmation redirect. Exchanges the `code` query param for a session using the server client, then redirects to `/`.

### Protected Routes

All routes not under `/login`, `/register`, or `/auth` require an authenticated session. The middleware enforces this check before any page or API handler runs.

---

## Storage Buckets

| Bucket      | Visibility | Contents                                             | Path convention                       |
| ----------- | ---------- | ---------------------------------------------------- | ------------------------------------- |
| `svgs`      | Public     | Sketch SVG sets exported as `.webp` images           | `{userId}/{setName}/{part-side}.webp` |
| `landmarks` | Public     | Pose landmark JSON files (array of `LandmarkFrame`)  | `{userId}/{filename}.json`            |
| `user_data` | Private    | User-specific data (reserved, not yet actively used) | `{userId}/...`                        |

### Path Convention

All storage paths begin with `{user.id}/` to namespace files by user. API routes validate that requested keys start with the authenticated user's ID before performing any read or write.

---

## API Route Pattern

All API routes that touch storage follow this pattern:

```typescript
// 1. Create per-request server client (for user identity)
const supabase = await createClient(); // lib/supabase/server

// 2. Authenticate
const {
  data: { user },
  error,
} = await supabase.auth.getUser();
if (!user) return 401;

// 3. Validate path ownership
if (!requestedPath.startsWith(`${user.id}/`)) return 403;

// 4. Write via admin client (bypasses RLS) with fallback
const storageClient = supabaseAdmin ?? supabase;
await storageClient.storage.from('svgs').upload(path, data);
```

This pattern ensures:

- User identity is always verified via a cookie-bound per-request client
- Storage writes succeed even when RLS policies don't explicitly allow them
- No client code ever has access to the service role key

---

## API Routes Summary

| Route                     | Method   | Bucket       | Operation              |
| ------------------------- | -------- | ------------ | ---------------------- |
| `/api/storage/upload`     | POST     | `svgs`       | Upload SVG set         |
| `/api/storage/upload`     | GET      | `svgs`       | Download SVG set       |
| `/api/storage/landmarks`  | POST     | `landmarks`  | Upload landmark file   |
| `/api/storage/landmarks`  | GET      | `landmarks`  | Download landmark file |
| `/api/storage/list`       | GET      | any allowed  | List user's files      |
| `/api/storage/animations` | GET/POST | `animations` | Animations (reserved)  |
| `/api/storage/files`      | DELETE   | configured   | Delete file            |

---

## Row Level Security (RLS)

The app does not rely on RLS for storage write access — the admin client bypasses RLS entirely. This is intentional: RLS storage policies for the `svgs` and `landmarks` public buckets are kept minimal, and all access control logic lives in the API route handlers.

RLS is still present on auth-managed tables. The server client (publishable key) respects RLS for any database table reads. The admin client bypasses all RLS.

---

## Security Rules

- `SUPABASE_SERVICE_ROLE_KEY` must never appear in client-side bundles (no `NEXT_PUBLIC_` prefix)
- All storage path parameters in API routes are validated to start with `{user.id}/` before use
- Content-Length limits are enforced before parsing request bodies (e.g. 10 MB for landmarks)
- File names are sanitized before use as storage keys: `name.replace(/[^a-zA-Z0-9_-]/g, '_')`
- Bucket name is validated against an allowlist (`['landmarks', 'svgs', 'animations']`) before any storage call
