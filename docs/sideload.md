# Sideload Guide — Garou APK

Install the Garou APK on your Android device without the Play Store.

---

## Prerequisites

- An [Expo account](https://expo.dev) with EAS set up for this project (`eas init` already run)
- Android device (Galaxy Watch 7 paired, Health Connect installed)
- Developer options enabled on the device:
  Settings → About phone → tap "Build number" 7 times → Developer options now visible

---

## Step 1: Trigger the EAS Build

Run from the repo root:

```bash
eas build -p android --profile preview
```

This submits a cloud build. EAS will:
1. Bundle the JS
2. Compile the native Android project
3. Sign the APK with the managed keystore
4. Upload the artifact to the EAS dashboard

Alternatively, trigger the build from the EAS dashboard:
[expo.dev/accounts/[username]/projects/garou/builds](https://expo.dev/accounts/[username]/projects/garou/builds)

Build time is typically 5–15 minutes.

---

## Step 2: Download the APK

Once the build shows "Finished" in the dashboard:

1. Go to [expo.dev/accounts/[username]/projects/garou/builds](https://expo.dev/accounts/[username]/projects/garou/builds)
2. Click the completed build
3. Click **Download** — this downloads a `.apk` file (not `.aab`)

> The preview profile in `eas.json` uses `buildType: "apk"`, so the artifact is
> directly installable. No AAB → APK conversion needed.

---

## Step 3: Enable "Install unknown apps" on Android

Android blocks installations from outside the Play Store by default.

**Method A — via the file manager / browser (recommended for USB transfer):**

1. Settings → Apps → Special app access → Install unknown apps
2. Find your file manager (e.g. "My Files", "Files") or browser
3. Toggle **Allow from this source** → ON

**Method B — Android will prompt you:**

When you tap the APK, Android may show a prompt:
"Your phone is not allowed to install unknown apps from this source."
Tap **Settings** in the prompt and toggle **Allow**.

---

## Step 4: Transfer the APK to the Device

**Option A — USB cable (fastest):**

1. Connect device via USB
2. On the device, select **File Transfer / MTP** mode (not just charging)
3. On the computer, drag the `.apk` file to `Internal storage/Download/`
4. On the device, open the file manager → Downloads → tap the APK

**Option B — Direct download link on device:**

1. In the EAS dashboard build page, tap the **Download** button directly on the device's browser
2. The APK lands in Downloads automatically

**Option C — adb (USB debugging required):**

```bash
adb install path/to/garou.apk
```

If the app is already installed, use `-r` to replace:

```bash
adb install -r path/to/garou.apk
```

---

## Step 5: Install

- File manager route: tap the APK file → Android installer dialog appears → tap **Install**
- adb route: installation completes in the terminal — no tapping needed on device

---

## Step 6: First Launch — Grant Health Connect Permissions

1. Open **Garou** from the app drawer
2. A Health Connect permissions dialog will appear listing all data types:
   - Steps
   - Heart rate
   - Sleep
   - Heart rate variability (HRV)
   - Active calories burned
3. Tap **Allow all** (or grant each individually)
4. Navigate to the **Today** tab — watch data should appear within a few seconds

> Health Connect pulls data from Samsung Health, which syncs from the Galaxy Watch 7.
> Make sure Samsung Health has synced recently before checking the Today tab.

---

## Troubleshooting

### Build fails

| Symptom | Fix |
|---------|-----|
| "Project not found" | Run `eas init` to link the repo to your EAS project |
| "Missing projectId" | Run `eas init` or manually add `extra.eas.projectId` to `app.json` |
| Gradle / SDK error | Check `compileSdkVersion` / `targetSdkVersion` in `app.json` plugins config (must be 34) |
| OOM during JS bundle | Retry — EAS build machines are shared; transient failures resolve on retry |

### APK won't install

| Symptom | Fix |
|---------|-----|
| "App not installed" | A previous version with a different signature is installed — uninstall it first, then reinstall |
| "Parse error" | The download was interrupted — re-download the APK |
| "Unknown sources blocked" | Complete Step 3 above |

### Health Connect permissions not showing

| Symptom | Fix |
|---------|-----|
| No permissions dialog on first launch | Open Settings → Apps → Garou → Permissions → check if Health Connect is listed |
| Dialog appears but HRV is missing | Rebuild — `READ_HEART_RATE_VARIABILITY` must be in `app.json` before the build |
| Permissions granted but data is null | Verify Samsung Health is running and the Watch has synced; wait ~60 s and restart the app |

---

## Keystore — Important

After the first successful build, EAS generates a keystore and manages it for you.

**Action required:** Download and store it safely.

1. EAS dashboard → project → Credentials → Android keystore
2. Download the `.jks` file and the key alias / passwords
3. Store in a password manager or secure offline backup

You need the **same keystore** for every future update. If it is lost, Android will
treat the next APK as a different app and existing users must uninstall before
reinstalling.
