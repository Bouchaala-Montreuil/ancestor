# Packaging ANCESTOR as a real Android app

## What you have right now

`dist/ancestor.html` and the `index.html` PWA are **installable on Android
today**. That is not the same as a Play Store APK, and this project does not
pretend otherwise.

### Install the PWA immediately (no build, no store)

1. Put the app on any HTTPS URL (GitHub Pages, Netlify, Cloudflare Pages, or any
   static host — it is four files).
2. Open that URL in Chrome on Android.
3. Menu → **Install app** / **Add to Home screen**.

It opens full-screen, has no browser chrome, works completely offline, and
updates automatically when you change the files.

---

## Turning it into a Play Store APK

A Trusted Web Activity (TWA) wraps the PWA in a native Android shell. Two routes:

### Route A — PWABuilder (no Android SDK, ~10 minutes, free)

1. Host the PWA over HTTPS.
2. Go to **https://www.pwabuilder.com**
3. Enter the URL → **Package for stores** → **Android**.
4. Download the generated signed AAB/APK and the asset-links file.
5. Upload to the Play Console.

Microsoft runs this free and handles signing. This is the fastest path.

### Route B — Bubblewrap (full control, needs the Android SDK)

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://YOUR-DOMAIN/manifest.webmanifest
bubblewrap build          # -> app-release-signed.apk  +  app-release-bundle.aab
bubblewrap install        # push straight to a connected phone
```

`android/twa-manifest.json` in this folder is pre-filled. Change `host` and
`packageId` before running `bubblewrap init`.

First run walks you through installing the JDK (17+) and the Android SDK
command-line tools. It downloads about 1.5 GB.

---

## The one thing that must be right: Digital Asset Links

A TWA only hides the browser chrome if Android can prove you own both the app
and the domain. Host this at `https://YOUR-DOMAIN/.well-known/assetlinks.json`:

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "app.ancestor.training",
    "sha256_cert_fingerprints": ["REPLACE_WITH_YOUR_SIGNING_CERT_SHA256"]
  }
}]
```

If this file is wrong or missing, the app still works — it just shows a URL bar
at the top. That is the single most common TWA failure.

---

## Play Store notes

- **Category:** Health & Fitness.
- **Data safety declaration:** ANCESTOR stores everything locally. No account,
  no analytics, no data collection, no data sharing. Declare accordingly — this
  is genuinely true and worth saying in the listing.
- **Content rating:** the app gives training guidance, not medical advice.
  The in-app About screen states this explicitly.
- **Target SDK:** whatever Bubblewrap/PWABuilder emits (34+ at the time of writing).

---

## Requirements checklist before you publish

- [ ] PWA served over HTTPS with a valid certificate
- [ ] `manifest.webmanifest` reachable, with 192 and 512 icons + a maskable icon
- [ ] Service worker registered (offline works)
- [ ] `/.well-known/assetlinks.json` correct
- [ ] About / privacy screen reachable from inside the app (it is: You → About)
- [ ] Data export and deletion work (they are tested — see `tests/`)
