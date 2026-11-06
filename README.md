# Tailor

Tailor is a stitching floor for a bespoke tailor. It opens on the work in progress: garments moving through cutting, stitching, finishing, trial, and ready. Measurements, invoices, and payments stay one step away. The sample shop is in Lucknow, with Indian garments, inch measurements, and rupee prices.

The phone app and the web app are separate. They both talk to one small API. If that API cannot be reached, each app shows a copy of the sample book kept on the device so the screens still open.

## API

Node and TypeScript. Orders, customers, measurements, and payments are stored in Supabase Postgres. The service role stays on the server. Changes last as long as the database does.

From `/agent/api`, copy the example env file and fill in the real values. Do not commit `.env`.

```
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PORT=4000
```

`PORT` is optional. It defaults to 4000.

```sh
cd /agent/api
npm install
npm start
```

Base URL: `http://localhost:4000`

- `GET /customers` and `GET /customers/:id`
- `POST /customers` to add a customer
- `POST /customers/:id/measurements` to add a measurement set
- `GET /orders` and `GET /orders/:id`
- `POST /orders/:id/advance` to move Cutting → Stitching → Finishing → Trial → Ready
- `POST /orders/:id/payments` with `{ "amount", "method", "note" }` to reduce the balance

The iOS simulator uses `http://localhost:4000`. The Android emulator uses `http://10.0.2.2:4000`. A phone on the same network needs your computer’s LAN address.

## PWA

Needs Node.js LTS.

```sh
cd /agent/pwa
npm install
npm run dev
```

The dev server is Vite, usually at `http://localhost:5173`. Narrow screens use a bottom nav. Wide screens use a side nav. A manifest and service worker make it installable. Set `VITE_API_URL` only if the API is not on `http://localhost:4000`.

## Mobile

React Native for iOS and Android, without Expo. The display name is Tailor.

On a Mac, install:

- Node.js LTS
- Watchman
- JDK 17 or newer
- Android Studio and the Android SDK, for Android
- Xcode and CocoaPods, for iOS

```sh
cd /agent/mobile
npm install
bundle install
cd ios && bundle exec pod install && cd ..
npm start
```

In a second terminal:

```sh
cd /agent/mobile
npm run ios
```

or

```sh
cd /agent/mobile
npm run android
```

This Linux environment has Node and a JDK, and does not have the Android SDK, Watchman, or Xcode. Run the native app on a Mac, or on a machine with the Android SDK. `npm run typecheck` in `mobile` checks TypeScript without an emulator.
