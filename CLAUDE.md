# CLAUDE.md — Bifrost HR Dashboard

## Project Structure

Monorepo with one FastAPI backend and three React frontends:

```
hr-dashboard/
├── backend/           → FastAPI API (Python 3.12, SQLAlchemy 2, Pydantic 2)
│   ├── app/api/       → Route handlers (57 modules)
│   ├── app/db/        → Models, migrations, seed scripts
│   └── app/services/  → Business logic services
├── frontend/          → HR Hub admin dashboard (React 19, Vite, Tailwind 4)
├── employee-portal/   → Employee self-service portal
├── applicant-portal/  → External job applicant portal
└── docs/              → Architecture, security, deployment docs
```

All three frontends share the same backend at `:8000`. Work on the `main` branch.

## Build & Verify

```bash
# Backend
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload

# Frontends (each is independent)
cd frontend && npm install && npm run build
cd employee-portal && npm install && npm run build
cd applicant-portal && npm install && npm run build

# Type-check only (no build output)
cd frontend && npx tsc -b
cd employee-portal && npx tsc -b
cd applicant-portal && npx tsc -b

# Backend tests
cd backend && pytest
```

## Tech Stack

- **Backend:** Python 3.12, FastAPI 0.120, SQLAlchemy 2.0, Pydantic 2.12, Uvicorn
- **Database:** SQLite (dev), PostgreSQL (prod) — same ORM models for both
- **Frontends:** React 19, TypeScript 5.9 (strict), Vite 7, Tailwind CSS 4
- **Auth:** JWT (httpOnly cookies), bcrypt, TOTP 2FA, RBAC (40+ permissions)
- **Linting:** ESLint + typescript-eslint (frontend), Pylint (backend, max-line-length: 120)

---

## Code Standards — ALWAYS FOLLOW THESE

### Python / Backend

**Sync vs Async Handlers**
- Use `def` (not `async def`) for route handlers that only do synchronous work (SQLAlchemy queries, file I/O, etc.). FastAPI auto-runs `def` handlers in a threadpool.
- Only use `async def` when the handler body contains `await` expressions (e.g., `aiosmtplib`, `httpx`, `aiofiles`).
- Never mix: do not put sync blocking calls (like `db.query()`) inside an `async def` handler without wrapping in `asyncio.to_thread()`.

```python
# CORRECT — sync DB work
@router.get("/items")
def list_items(db: Session = Depends(get_db)):
    return db.query(models.Item).all()

# CORRECT — async external call
@router.post("/notify")
async def send_notification(db: Session = Depends(get_db)):
    item = await asyncio.to_thread(db.query(models.Item).first)
    await send_email_async(item.email)

# WRONG — async with sync DB call blocks the event loop
@router.get("/items")
async def list_items(db: Session = Depends(get_db)):
    return db.query(models.Item).all()  # blocks!
```

**Logging**
- Use `logging` module, never `print()`. Every module should have: `logger = logging.getLogger(__name__)`.
- Use appropriate levels: `logger.debug()` for verbose diagnostics, `logger.info()` for normal operations, `logger.warning()` for recoverable issues, `logger.error()` for failures, `logger.exception()` inside except blocks.
- Never log PII (SSNs, full names + identifiers, passwords, tokens). The `AuditService` handles sensitive field sanitization — use it for audit trails.

```python
import logging
logger = logging.getLogger(__name__)

# CORRECT
logger.info("Processing payroll for period %s", period_id)
logger.error("Failed to send email to employee %s", employee_id)

# WRONG
print(f"Processing payroll for {employee.full_name}")
```

**Database & ORM**
- Always use SQLAlchemy ORM for queries — never raw SQL strings in runtime code. Raw SQL is acceptable only in one-time migration/seed scripts.
- Never use SQLite-specific operators (`GLOB`, `PRAGMA`, `AUTOINCREMENT`) in runtime code. Use ORM equivalents that work on both SQLite and PostgreSQL.
- Never use `LIKE '%{value}%'` on JSON/array columns — this causes false-positive matches (ID 1 matches 10, 11, 12, etc.). Instead, query the column with `.isnot(None)` and check list membership in Python.
- Always use `Column(JSON)` for structured data — maps to `JSONB` automatically on PostgreSQL.
- Use `EncryptedString` / `EncryptedText` column types for PII (SSN, bank accounts, salary amounts).

```python
# CORRECT — ORM query with Python-side membership check for JSON list columns
rows = db.query(models.JobRequisition).filter(
    models.JobRequisition.visibility_user_ids.isnot(None),
).all()
matching = [r for r in rows if user_id in (r.visibility_user_ids or [])]

# WRONG — LIKE on JSON column
db.execute(text(f"SELECT * FROM job_requisitions WHERE visibility_user_ids LIKE '%{user_id}%'"))
```

**API Patterns**
- All routers use `APIRouter(prefix=..., tags=[...])` and are mounted in `main.py`.
- Auth via `Depends(get_current_user)` or `Depends(require_permission(Permissions.XYZ))`.
- Use Pydantic `BaseModel` for request/response schemas — define them in the same API module, not a separate schemas file.
- Return Pydantic models or dicts, never raw SQLAlchemy model instances.
- Wrap optional feature checks in `hasattr(models, 'ModelName')` for graceful degradation.

**Dependencies**
- Pin all Python packages to exact versions (`==`) in `requirements.txt`. Never use `>=` or unpinned versions.
- After adding a new dependency, run `pip freeze | grep package-name` to get the exact version.

**Error Handling**
- Use `HTTPException` with appropriate status codes. Include `detail` messages that are safe for production (no stack traces, no internal paths).
- Wrap independent feature blocks in try/except for graceful degradation — one failing feature should not break the entire endpoint.

### TypeScript / Frontend

**Type Safety**
- TypeScript strict mode is enabled — never disable it.
- Never use `any`. Use `unknown` for truly unknown types, then narrow with type guards. Use `Record<string, unknown>` for generic objects. Define proper interfaces for API responses.
- In catch blocks, use `catch (err: unknown)` and narrow: `if (err instanceof Error) { ... }`.
- For event handlers, use the specific React event type: `React.ChangeEvent<HTMLInputElement>`, `React.MouseEvent<HTMLButtonElement>`, etc.

```typescript
// CORRECT
interface Employee {
  id: number;
  name: string;
  department: string;
}
const [employees, setEmployees] = useState<Employee[]>([]);

// WRONG
const [employees, setEmployees] = useState<any[]>([]);
```

**Code Splitting**
- All page-level components must use `React.lazy()` with a `<Suspense>` fallback. Only layout components and auth guards should be eagerly imported.
- For named exports, use: `const Comp = lazy(() => import("./file").then(m => ({ default: m.NamedExport })))`.
- Each frontend has a `PageLoader` spinner component for the Suspense fallback.

```tsx
// CORRECT — lazy page import
const EmployeesPage = lazy(() => import("./pages/EmployeesPage"));

// In routes:
<Suspense fallback={<PageLoader />}>
  <Routes>
    <Route path="/employees" element={<EmployeesPage />} />
  </Routes>
</Suspense>
```

**Error Boundaries**
- All three frontends must have an `ErrorBoundary` wrapping the app in `main.tsx`. If adding a new frontend entry point, include an ErrorBoundary.
- ErrorBoundary is a class component (React limitation) with retry and navigation options.

**Console Output**
- Use `console.error()` and `console.warn()` for genuine error/warning conditions only.
- Never use `console.log()` for debug output in committed code. Remove debug logging before committing.

**Unused Dependencies**
- Do not add packages speculatively. Only install what is actively used.
- Periodically audit with `npx depcheck` and remove unused packages.

**Styling**
- Tailwind CSS v4 (`@import "tailwindcss"` / `@theme {}`) — no `tailwind.config.js` in employee-portal or applicant-portal.
- Bifrost design tokens: Violet `#6C3FA0`, Teal `#2ABFBF`, Gold `#E8B84B`.
- Support dark mode via Tailwind `dark:` variants.

### Git & Version Control

- Commit messages: short imperative summary line, optional body explaining "why".
- Pin all dependencies (npm `package-lock.json`, pip `requirements.txt` with `==`).
- Never commit `.env` files, credentials, API keys, or secrets. Use `.env.example` for documentation.
- The `frontend/` directory is a nested git repo (gitlink) sharing the same remote — changes there must be committed and pushed separately.

### Security Practices

- All secrets via `os.getenv()` — never hardcode credentials, keys, or tokens.
- CORS origins are environment-specific (never `["*"]` in production).
- CSRF protection enabled via double-submit cookie pattern.
- Rate limiting on sensitive endpoints (login, password reset).
- Input validation: use Pydantic models for all request bodies; validate file uploads (type, size).
- Encrypt PII at rest with `EncryptedString` / `EncryptedText` column types.
- Mask SSN in API responses (last 4 digits only).
- Audit sensitive operations via `AuditService` (security events, PII changes, FMLA, performance).

### Infrastructure & Deployment

- Storage abstraction: use `storage_service.py` (`StorageBackend` ABC) for file operations — supports local and Azure Blob via `STORAGE_BACKEND` env var. Never write directly to filesystem paths.
- All configuration via environment variables. Document new env vars in `.env.example`.
- Health check: `GET /health` must remain functional for load balancer monitoring.
- Migration scripts in `app/db/` are SQLite-specific development tools. Production PostgreSQL uses the ORM models directly (future: Alembic).

---

## Pre-Commit Checklist

Before committing any changes, verify:

1. **Backend:** `cd backend && python -c "import app.main"` — no import errors
2. **Frontends:** `npx tsc -b` passes in each modified frontend — no type errors
3. **No `print()`** in new/modified Python files — use `logging`
4. **No `any`** in new/modified TypeScript files — use proper types
5. **No `console.log()`** in new/modified TypeScript files — use `console.error`/`console.warn` only for real errors
6. **No raw SQL** in new runtime Python code — use ORM
7. **Lazy imports** for any new page components — use `React.lazy()`
8. **Dependencies pinned** — exact versions in `requirements.txt` and `package-lock.json`
9. **No secrets** in committed code — check for hardcoded URLs, keys, passwords
10. **`.env.example` updated** if new env vars were added
