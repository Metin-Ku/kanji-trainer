# Kanji Trainer — Deploy Rehberi

Bu rehber Supabase + Render + Vercel ile bedava deploy icin hazirlandi.

## On kosullar

- GitHub hesabi
- [Supabase](https://supabase.com), [Render](https://render.com), [Vercel](https://vercel.com) hesaplari
- Bilgisayarda [pnpm](https://pnpm.io) kurulu

## Proje yapisi

```
kanji-trainer/
  artifacts/frontend/   React + Vite (Vercel)
  artifacts/backend/    Express API (Render)
  lib/db/               Drizzle sema
  backup.sql            Orijinal yedek
  scripts/import-words-data.sql  Veri import (sema sonrasi)
```

---

## Adim 1 — Supabase (Veritabani)

1. Supabase > **New Project** olustur
2. **Settings > Database > Connection string > URI** kopyala
   - Render icin **Transaction pooler** URL onerilir (port 6543)
   - Sona `?sslmode=require` ekleyin
3. Yerelde sema olustur (proje kokunde `.env` dosyasi olusturun, icine `DATABASE_URL=...` yazin):
   ```powershell
   # PowerShell — .env dosyasi otomatik okunur
   pnpm install
   pnpm --filter @workspace/db run push
   ```
   Alternatif (`.env` yoksa):
   ```powershell
   $env:DATABASE_URL = "postgresql://..."
   pnpm --filter @workspace/db run push
   ```
4. **SQL Editor** ac, `scripts/import-words-data.sql` icerigini yapistir, **Run**
   - `COPY ... FROM stdin` Supabase SQL Editor'de calismayabilir; o zaman asagidaki alternatifi kullanin

### Alternatif veri import (COPY calismazsa)

Supabase Dashboard > **Table Editor > words > Import data from CSV** veya pgAdmin/psql ile:
```bash
psql "YOUR_DATABASE_URL" -f backup.sql
```
(Eger tablo zaten varsa once sadece veri satirlarini import edin.)

5. Sequence kontrol:
   ```sql
   SELECT setval('public.words_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.words));
   ```

---

## Adim 2 — GitHub

Repoyu GitHub'a push edin (Render ve Vercel GitHub'dan deploy eder).

---

## Adim 3 — Render (Backend API)

[`render.yaml`](render.yaml) iki servis tanimlar (`kanji-trainer-api-cv`, `kanji-trainer-api-personal`). Tek instance icin yalnizca birini kullanin veya Blueprint ile ikisini birden olusturun.

1. Render > **New > Web Service** (veya **Blueprint**) > GitHub repo sec
2. Ayarlar:
   - **Root Directory:** `artifacts/backend`
   - **Build Command:** `cd ../.. && pnpm install && pnpm --filter @workspace/backend run build`
   - **Start Command:** `node --enable-source-maps dist/index.mjs`
   - **Health Check Path:** `/api/healthz`
3. Environment Variables:
   - `DATABASE_URL` = Supabase **Transaction pooler** URI (asagiya bakin)
   - `NODE_ENV` = `production`

**Render DATABASE_URL — direct host KULLANMAYIN**

`db.xxx.supabase.co:5432` IPv6 kullanir → Render `ENETUNREACH` verir.

Supabase → **Settings → Database → Connection string → Transaction pooler** kopyalayin:

```
postgresql://postgres.nsxgzydphobasyyygawl:SIFRE@aws-0-REGION.pooler.supabase.com:6543/postgres
```

- Kullanici: `postgres.PROJECT_REF` (sadece `postgres` degil)
- Port: **6543**

4. Deploy sonrasi URL alin: `https://kanji-trainer-api.onrender.com` (ornek)
5. Test: `https://SIZIN-URL.onrender.com/api/healthz` -> `{"status":"ok"}`

**Not:** Bedava plan 15 dk sonra uyur; ilk istek 30-60 sn surebilir.

---

## Adim 4 — Vercel (Frontend)

1. Vercel > **Add New Project** > GitHub repo
2. Ayarlar:
   - **Root Directory:** `artifacts/frontend`
   - **Framework Preset:** Vite
   - **Build Command:** `cd ../.. && pnpm install && pnpm --filter @workspace/frontend run build`
   - **Output Directory:** `dist/public`
3. Environment Variables (**Production** scope, build icin gerekli):
   - `BASE_PATH` = `/`
   - `NODE_ENV` = `production`
   - `VITE_API_ORIGIN` = Render backend origin (sonunda `/` yok), ornek: `https://kanji-trainer.onrender.com`
4. Deploy edin. Env degisikliginden sonra mutlaka **Redeploy** yapin (Build cache kapali deneyin).
5. Build loglarinda `[vite] VITE_API_ORIGIN is not set` uyarisi **olmamali**.
6. Browser Network'te istekler `SIZIN-RENDER.onrender.com/api/...` adresine gitmeli (`vercel.app/api/...` degil).

**Not:** API istekleri dogrudan Render'a gider (`VITE_API_ORIGIN`). Vercel rewrite gerekmez. CV + kisisel icin [Cift instance deploy](#cift-instance-deploy-cv--kisisel) bolumune bakin.

---

## Adim 5 — Dogrulama

- [ ] Ana sayfa aciliyor, turuncu tema ve Japonca fontlar dogru
- [ ] Kelime listesi yukleniyor
- [ ] Kelime ekle / duzenle / sil calisiyor
- [ ] Study modu calisiyor

---

## Yerel gelistirme

Proje kokunden tek komut (`.env` dosyasini otomatik okur, backend + frontend birlikte baslar):

```powershell
pnpm install
Copy-Item .env.example .env   # DATABASE_URL doldurun
pnpm dev
```

- Frontend: http://localhost:3000 (Vite HMR)
- API: http://localhost:8080/api/healthz
- `.env` gitignore'da — Render/Vercel deploy'a dokunmaz
- Portlar: `BACKEND_PORT` / `FRONTEND_PORT` (varsayilan 8080 / 3000)

---

## Sorun giderme

| Sorun | Cozum |
|-------|-------|
| API 502 / timeout | Render servisi uyuyor olabilir; 1 dk bekleyip tekrar deneyin |
| Kelimeler yuklenmiyor / 404 on `vercel.app/api/*` | `VITE_API_ORIGIN` Production'da set mi? Push + Redeploy yaptiniz mi? Network'te istek Render host'una gitmeli |
| DATABASE_URL hatasi | Render'da **pooler URL** (6543) kullanin; direct `db.xxx.supabase.co` IPv6 → ENETUNREACH |
| `ENETUNREACH 2406:da14:...` | Supabase Transaction pooler URL'sine gecin (yukariya bakin) |
| Build hatasi PORT/BASE_PATH | Vercel env: BASE_PATH=/ veya vite.config varsayilanlari kullanilir |

---

## Cift instance deploy (CV + kisisel)

Ayni GitHub repo ve `main` branch'ten iki bagimsiz canli site: kod her push'ta ikisine de gider; yalnizca veritabani ve `VITE_API_ORIGIN` farklidir.

```
GitHub (main)
    ├── Render: kanji-trainer-api-cv        → Supabase CV
    ├── Render: kanji-trainer-api-personal  → Supabase kisisel
    ├── Vercel: cv-site      → VITE_API_ORIGIN = Render CV
    └── Vercel: personal-site → VITE_API_ORIGIN = Render kisisel
```

**Kural:** CV frontend yalnizca CV backend'e, kisisel frontend yalnizca kisisel backend'e baglanmali.

### 1 — Iki Supabase projesi

Her biri icin Adim 1'i tekrarlayin (ayri proje, ayri `DATABASE_URL`):

| Proje | Veri |
|-------|------|
| **CV** | Secilmis demo kelimeler, temiz SRS ornekleri |
| **Kisisel** | Tam kelime listeniz, gercek SRS ilerlemeniz |

**CV verisi hazirlama:**

1. Kisisel siteden **Ayarlar → Yedek indir** (`GET /api/backup`)
2. JSON'dan kisisel icerikleri cikarin veya kucuk bir subset birakin
3. CV Supabase'e import (SQL Editor, pgAdmin veya Table Editor CSV)
4. Sequence:
   ```sql
   SELECT setval('public.words_id_seq', (SELECT COALESCE(MAX(id), 1) FROM public.words));
   ```

**Mevcut canli deploy varsa:** Onu kisisel instance kabul edin; yalnizca CV stack'ini ekleyin.

### 2 — Iki Render backend servisi

[`render.yaml`](render.yaml) iki servis tanimlar. Render Dashboard > **New Blueprint** veya her servisi ayri olusturun:

| Servis | `DATABASE_URL` |
|--------|----------------|
| `kanji-trainer-api-cv` | Supabase CV (Transaction pooler, port **6543**) |
| `kanji-trainer-api-personal` | Supabase kisisel |

Her ikisi de:

- GitHub repo, branch: **`main`**
- Root Directory: `artifacts/backend`
- Build / Start / Health check: Adim 3 ile ayni
- `NODE_ENV` = `production`
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — bootstrap admin (Render env, repoya yazmayin)
- `FRONTEND_ORIGINS` — CORS icin virgulle ayrilmis Vercel + local URL'ler (sonunda `/` yok)

Ornek Render env:

| Render servisi | `FRONTEND_ORIGINS` |
|----------------|-------------------|
| Kisisel (`kanji-trainer.onrender.com`) | `http://localhost:3000,https://kanji-trainer-five.vercel.app` |
| CV (`kanji-trainer-cv.onrender.com`) | `http://localhost:3000,https://kanji-trainer-cv-two.vercel.app` |
| CV only | `DEMO_AUTO_LOGIN=true`, `DEMO_USER_ID=1` |

Auth semasini her Supabase'e bir kez uygulayin: `pnpm db:migrate-auth` (lokal `.env` icindeki `DATABASE_URL` hedef DB olmali).

Deploy sonrasi URL'leri not edin ve test edin:

```
GET https://kanji-trainer-api-cv.onrender.com/api/healthz
GET https://kanji-trainer-api-personal.onrender.com/api/healthz
```

### 3 — Iki Vercel frontend projesi

Her proje Adim 4 ile ayni build ayarlarina sahip olmali. **Environment Variables** proje bazinda farklidir:

| Vercel projesi | `VITE_API_ORIGIN` (Production) |
|----------------|--------------------------------|
| CV (or. `kanji-trainer-cv`) | `https://kanji-trainer-api-cv.onrender.com` |
| CV only | `VITE_DEMO_MODE=true` |
| Kisisel (or. `kanji-trainer-five`) | `https://kanji-trainer.onrender.com` |

- Sonunda `/` olmamali
- Degisiklikten sonra **Redeploy** gerekir (build-time env)
- Lokal gelistirmede bos birakilir; Vite `/api` isteklerini localhost:8080'e proxy eder

SPA fallback (`vercel.json`) repodan gelir; API icin Vercel rewrite gerekmez.

Domain (opsiyonel): CV icin portfolio subdomain, kisisel icin ayri URL.

### 4 — Eslestirme tablosu

| | CV | Kisisel |
|---|-----|---------|
| Vercel | `kanji-trainer-cv` | `kanji-trainer-personal` |
| Render | `kanji-trainer-api-cv` | `kanji-trainer-api-personal` |
| Supabase | Proje A | Proje B |

### 5 — Gunluk workflow

1. Lokal: `.env` → kisisel Supabase
2. `pnpm dev` ile gelistir
3. `git push origin main` → 4 deploy (2 Render + 2 Vercel)
4. Veri otomatik senkron **olmaz** — CV verisini bilincli backup/import ile guncelleyin

### 6 — Cift instance dogrulama

Her instance icin ayri ayri:

- [ ] `/api/healthz` OK
- [ ] Ana sayfa aciliyor, kelime listesi yukleniyor
- [ ] Kelime ekle / duzenle / sil calisiyor
- [ ] SRS calisma modu calisiyor
- [ ] CV sitesinde kisisel kelimeler gorunmuyor (DB ayrimi dogru)
- [ ] Browser Network: `/api/words` istegi dogru Render host'una gidiyor (`VITE_API_ORIGIN`)

### Maliyet ve kisitlar

- Supabase free x2, Render free x2, Vercel free x2
- Render free tier: 15 dk idle sonrasi uyku; ilk istek 30-60 sn
