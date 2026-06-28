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

1. Render > **New > Web Service** > GitHub repo sec
2. Ayarlar:
   - **Root Directory:** `artifacts/backend`
   - **Build Command:** `cd ../.. && pnpm install && pnpm --filter @workspace/backend run build`
   - **Start Command:** `node --enable-source-maps dist/index.mjs`
   - **Health Check Path:** `/api/healthz`
3. Environment Variables:
   - `DATABASE_URL` = Supabase connection string
   - `NODE_ENV` = `production`
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
3. Environment Variables (Build):
   - `BASE_PATH` = `/`
   - `NODE_ENV` = `production`
4. Deploy oncesi `artifacts/frontend/vercel.json` icindeki Render URL'sini guncelleyin:
   ```json
   "destination": "https://SIZIN-RENDER-URL.onrender.com/api/:path*"
   ```
5. Deploy edin ve siteyi acin

---

## Adim 5 — Dogrulama

- [ ] Ana sayfa aciliyor, turuncu tema ve Japonca fontlar dogru
- [ ] Kelime listesi yukleniyor
- [ ] Kelime ekle / duzenle / sil calisiyor
- [ ] Study modu calisiyor

---

## Yerel gelistirme

```bash
pnpm install
set DATABASE_URL=postgresql://...
pnpm --filter @workspace/backend run dev
# Baska terminal:
set PORT=3000
set BASE_PATH=/
pnpm --filter @workspace/frontend run dev
```

---

## Sorun giderme

| Sorun | Cozum |
|-------|-------|
| API 502 / timeout | Render servisi uyuyor olabilir; 1 dk bekleyip tekrar deneyin |
| Kelimeler yuklenmiyor | vercel.json Render URL dogru mu? Browser Network sekmesinde /api/words kontrol edin |
| DATABASE_URL hatasi | Supabase pooler URL + sslmode=require kullanin |
| Build hatasi PORT/BASE_PATH | Vercel env: BASE_PATH=/ veya vite.config varsayilanlari kullanilir |
