# Kanji Trainer — Mobile (Expo Go)

React Native app in the same monorepo as web. Uses **Expo SDK 54** so it works with the **App Store version of Expo Go** (SDK 57 is not on the store yet).

MVP: home (search + 3 study links), words / pronunciation / meaning lists.

## Prerequisites

- Windows PC with [pnpm](https://pnpm.io) (already used for this repo)
- iPhone with **Expo Go** from the App Store
- Backend deployed on Render (or local API reachable from phone — see below)
- Same login email/password as the web app

## 1. Configure API URL

Create `artifacts/mobile/.env`:

```env
EXPO_PUBLIC_API_ORIGIN=https://YOUR-RENDER-API.onrender.com
```

Use the same URL as `VITE_API_ORIGIN` on Vercel (no trailing slash).

After changing `.env`, restart Expo (`Ctrl+C`, then `pnpm mobile` again).

## 2. Install dependencies

From the **repo root**:

```powershell
pnpm install
```

## 3. Start Expo (Windows)

```powershell
pnpm mobile
```

Or:

```powershell
cd artifacts/mobile
pnpm start
```

A QR code appears in the terminal (and in the browser Dev Tools page).

## 4. Open on iPhone 17 (Expo Go)

1. Install **Expo Go** from the App Store.
2. iPhone and PC on the **same Wi‑Fi** (recommended).
3. Open Expo Go → **Scan QR code** → scan the terminal QR code.
4. Wait for the bundle to load (first load can take a minute).

### If QR / LAN fails

Start with tunnel mode (works across networks, slower):

```powershell
cd artifacts/mobile
pnpm exec expo start --tunnel
```

### If API calls fail on phone

- `EXPO_PUBLIC_API_ORIGIN` must be your **public** Render HTTPS URL, not `localhost`.
- Log in with the same account as web.
- Render free tier may sleep — first request can take ~30s.

## 5. Local backend instead of Render (optional)

If you run `pnpm dev` on PC and want the phone to hit your PC API:

1. Find PC IP: `ipconfig` → Wi‑Fi IPv4 (e.g. `192.168.1.42`).
2. `artifacts/mobile/.env`:

   ```env
   EXPO_PUBLIC_API_ORIGIN=http://192.168.1.42:8080
   ```

3. Ensure Windows Firewall allows port 8080.
4. Backend must listen on `0.0.0.0` (default in this project).

Note: iOS may block plain `http` in some cases; HTTPS Render URL is simpler.

## Project layout

```
artifacts/mobile/
  app/              Expo Router screens
  src/
    components/     SearchBar, StudyLinkRow, …
    hooks/          useWords (shared API client)
    lib/            auth, API config
    i18n/
    theme/
```

Shared API: `@workspace/api-client-react` (same as web).

## MVP screens

| Screen | Route |
|--------|--------|
| Login | `/login` |
| Home (search + 3 links) | `/` |
| Words | `/words` |
| All words | `/words?all=1` |
| Pronunciation | `/pronunciation` |
| Meaning | `/meaning` |

## Typecheck

```powershell
pnpm --filter @workspace/mobile run typecheck
```

---

## EAS Update — PC kapalıyken Expo Go (önerilen)

Kod değişikliklerini Expo sunucusuna yüklersin; iPhone **Expo Go** ile açarsın. PC’de `pnpm mobile` çalışması gerekmez (Render API yine 7/24 çalışır).

### Bir kez kurulum

1. Ücretsiz hesap: [expo.dev/signup](https://expo.dev/signup)

2. Giriş yap (proje kökünden):

```powershell
cd c:\Users\Metin\Downloads\kanji-trainer\artifacts\mobile
pnpm exec eas login
```

3. Projeyi Expo’ya bağla:

```powershell
pnpm mobile:eas:init
```

Sorular:
- **Create a new project** → Evet
- `app.config.ts` içine `projectId` eklenir (commit edebilirsin)

4. `artifacts/mobile/.env` dosyan hazır olsun (`EXPO_PUBLIC_API_ORIGIN=...`). Update sırasında bundle’a gömülür.

### Her kod değişikliğinden sonra (telefona yansıtmak)

```powershell
cd c:\Users\Metin\Downloads\kanji-trainer
pnpm mobile:update
```

Terminalde **QR kod** ve **expo.dev linki** çıkar.

### iPhone’da açmak

**İlk sefer:**
1. Expo Go → QR okut (update komutundan çıkan)
2. veya [expo.dev](https://expo.dev) → Projects → **kanji-trainer** → **Open in Expo Go**

**Sonraki seferler (PC kapalı):**
- Expo Go → **Recently opened** → kanji-trainer
- veya expo.dev proje sayfasından **Open in Expo Go**

Yeni update yükledikten sonra: Expo Go’da projeyi kapat/aç veya shake → Reload.

### Geliştirme sırasında anlık önizleme

Kod yazarken hızlı döngü için hâlâ:

```powershell
pnpm mobile
```

(Fast Refresh — kaydet, telefonda gör)

Update’i sadece “PC’siz kullanacağım sürüm” hazır olunca çalıştır.

### Özet

| Mod | Komut | PC gerekir mi? |
|-----|--------|----------------|
| Geliştirme (anlık) | `pnpm mobile` | Evet |
| PC kapalı kullanım | `pnpm mobile:update` | Sadece publish anında |

---

## Next steps (not in MVP)

- SRS, progress, settings, themes, categories
- Study mode, sort, pin, edit/delete words
- Turkish locale (web has `tr.ts`; mobile currently English only)
