# Installable app and app stores

Kalo is a Progressive Web App (PWA). Most people never need a store app: they open the site and choose **Install** (Android, Chrome, Edge) or **Share → Add to Home Screen** (iPhone, iPad). Settings → Install the app shows the right steps for their device.

## What works offline

| Works offline | Needs a connection |
|---|---|
| Quick-add food (calories and macros) and water, saved on the device | Food search, barcode lookups, recipes |
| Seeing what's waiting to sync | AI meal photos and the coach |
| | Today, progress and settings pages |

When a page can't load, the service worker shows `/offline`, where people can keep logging. Entries are stored in IndexedDB (`kalo-offline`) with a random id each and sent to `/app/offline-sync` the next time the app opens online. The id makes retries safe: the database stores each entry once.

## How the service worker handles data (security item 39)

- It caches only hashed build files (`/_next/static`), icons and the `/offline` page.
- Page loads always go to the network and are never stored. `/app`, `/api`, auth routes and data requests are never cached.
- Each deploy gets a new cache version (from `VERCEL_GIT_COMMIT_SHA`), and old caches are deleted.
- Logging out and deleting an account clear the offline queue and Kalo's caches on that device.

Source: `src/app/sw.js/route.ts`. It's off in `next dev`; set `NEXT_PUBLIC_ENABLE_SW=1` to test it locally.

## Google Play and the App Store (optional)

`capacitor.config.json` wraps the live site in a native shell with [Capacitor](https://capacitorjs.com). The app loads `server.url`, so web deploys update the app without a store release. Change `server.url` if the site moves to another domain.

You need a Mac with Xcode for iOS, and Android Studio for Android. Store accounts cost money (Google Play: one-time fee; Apple: yearly fee).

```bash
npm install --save-dev @capacitor/cli
npm install @capacitor/core @capacitor/android @capacitor/ios
npx cap add android
npx cap add ios
npx cap sync
npx cap open android   # or: npx cap open ios
```

Before submitting:

- Replace the default app icons and splash screens with the Kalo icons from `public/icons`.
- Apple rejects apps that are just a website. If you submit to the App Store, add native value first (for example push reminders with `@capacitor/push-notifications`, or Apple Health with a HealthKit plugin).
- Both stores ask for a privacy policy URL: use `/privacy` on the live site.
- Security item 40: add an app-switcher privacy screen (e.g. `@capacitor/privacy-screen`), an optional biometric lock, and keep release builds free of debug logging.
- Health data: declare it in the Play Console's Data safety form and in Apple's App Privacy section.
