# RescueLink (Expo)

On-demand recovery marketplace — **mock-data MVP**. Server integration comes later.

## Where this folder lives

This project was created at **`C:\Users\naz43\dev\rescuelink`** (on your C: drive). Automated commands from Cursor could not create **`C:\dev`** on your PC; if you want that exact path, run **once** in an elevated PowerShell:

```powershell
New-Item -ItemType Directory -Force -Path "C:\dev"
Move-Item -Path "$env:USERPROFILE\dev\rescuelink" -Destination "C:\dev\rescuelink"
```

Or keep working here — both are on `C:`.

## Setup

```powershell
cd $env:USERPROFILE\dev\rescuelink
npm install
npx expo start
```

### Optional: app icons (store builds)

For a store build you will want PNG assets under `assets/`. Pull them from Expo’s template:

```powershell
$assets = "$env:USERPROFILE\dev\rescuelink\assets"
New-Item -ItemType Directory -Force -Path $assets | Out-Null
$base = "https://raw.githubusercontent.com/expo/expo/sdk-54/templates/expo-template-blank-typescript/assets"
Invoke-WebRequest -Uri "$base/icon.png" -OutFile "$assets/icon.png" -UseBasicParsing
Invoke-WebRequest -Uri "$base/splash-icon.png" -OutFile "$assets/splash-icon.png" -UseBasicParsing
Invoke-WebRequest -Uri "$base/adaptive-icon.png" -OutFile "$assets/adaptive-icon.png" -UseBasicParsing
Invoke-WebRequest -Uri "$base/favicon.png" -OutFile "$assets/favicon.png" -UseBasicParsing
```

Then add `"icon": "./assets/icon.png"` (and related keys) back into `app.json` if needed.

## Stack

- Expo SDK **54**, React Native **0.81**, TypeScript

Next steps: mock API layer, navigation (customer vs operator), maps UI with fake coordinates.
