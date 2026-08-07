# react-native-ar-preview

<p align="center">
  <img src="https://raw.githubusercontent.com/dawidspisak/react-native-ar-preview/main/.github/react-native-ar-preview.gif" width="280" alt="Demo: opening a 3D model in the native AR viewer" />
</p>

View 3D models in the **native AR viewer** from React Native - the mobile
equivalent of [`<model-viewer>`](https://modelviewer.dev)'s "View in AR"
button.

- **iOS** - presents [AR Quick Look](https://developer.apple.com/augmented-reality/quick-look/) with a USDZ model
- **Android** - launches [Scene Viewer](https://developers.google.com/ar/develop/scene-viewer) with a GLB model

One call, the platform's own AR experience, **zero runtime dependencies**.
No embedded AR view, no 3D engine, no scene graph to manage.

## Installation

```sh
npm install react-native-ar-preview
```

Then rebuild your app (`pod install` runs via autolinking; Expo users run
`npx expo prebuild` and make a new development build).

**Requirements:**

- React Native **0.76+** with the **New Architecture** (the default since 0.76).
- Bare React Native or Expo **development builds** - not Expo Go (ships native code).
- **Android**: [Google Play Services for AR](https://play.google.com/store/apps/details?id=com.google.ar.core) on the device; the GLB model must be an **HTTPS** URL (Scene Viewer downloads it itself).
- **iOS**: ARKit-capable device for the AR mode; Quick Look falls back to a 3D object view otherwise.

## Usage

```tsx
import { openAR, isARAvailable, ErrorCodes } from 'react-native-ar-preview';

const viewInAR = async () => {
  try {
    await openAR({
      usdz: 'https://example.com/models/chair.usdz',
      glb: 'https://example.com/models/chair.glb',
    });
  } catch (error) {
    if (error.code === ErrorCodes.AR_UNAVAILABLE) {
      console.warn('AR is not available on this device');
    }
  }
};
```

Hide the AR button on devices that cannot show AR at all:

```tsx
const available = await isARAvailable();
```

## API

### `openAR(source: ModelSource): Promise<void>`

Opens the platform's system AR viewer for the given model. The promise
**resolves once the viewer has been presented** - dismissal is not
reported (Scene Viewer runs in a separate activity and returns no result,
so a cross-platform dismissal signal would be a lie).

```ts
type ModelSource = {
  usdz?: string;
  glb?: string;
};
```

- `usdz` - used on iOS. Remote `https://` URLs are downloaded, validated,
  and cached automatically (in `Caches/`, keyed by URL - version your URLs
  to bust the cache). `file://` URLs are opened directly.
- `glb` - used on Android. Must be an `https://` URL; Scene Viewer fetches
  it itself and cannot open local files.

Android launches Scene Viewer in `ar_preferred` mode: devices with Scene
Viewer but without AR support still get the 3D fallback view.

### `isARAvailable(): Promise<boolean>`

- **iOS** - whether the device supports ARKit world tracking.
- **Android** - whether the Scene Viewer intent can be resolved.
- Any other platform - `false`.

### `ErrorCodes`

Rejections carry a `code` property with one of these stable values:

| Code                | Meaning                                                                                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E_INVALID_SOURCE`  | No format for the current platform, or a non-HTTPS `glb` URL on Android.                                                                                  |
| `E_DOWNLOAD_FAILED` | iOS could not download a usable USDZ file (network error, non-2xx status, or a response body that is not a USDZ archive). Nothing is cached in this case. |
| `E_AR_UNAVAILABLE`  | No system AR viewer on this device, or an unsupported platform.                                                                                           |
| `E_LAUNCH_FAILED`   | The viewer could not be presented for another reason.                                                                                                     |

## Model formats

Each platform consumes its own format - exactly like `<model-viewer>`'s
`src` / `ios-src` pair - so ship every model twice:

| Platform | Format | Notes                                        |
| -------- | ------ | -------------------------------------------- |
| iOS      | USDZ   | Downloaded by the library, cached on device. |
| Android  | GLB    | Fetched by Scene Viewer over HTTPS.          |

## Comparison with other solutions

Different tools solve different problems - pick by what you need:

|                      | react-native-ar-preview                                   | [ViroReact](https://reactvision.xyz/viro-react/) | [react-native-ar-viewer](https://github.com/riderodd/react-native-ar) | [`<model-viewer>`](https://modelviewer.dev) in a WebView      |
| -------------------- | --------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------------- | ------------------------------------------------------------- |
| Approach             | Launches the system AR viewer (Quick Look / Scene Viewer) | Embedded 3D/AR/VR engine inside your app         | Embedded AR view component                                            | Web component rendered in a WebView                           |
| Scene control        | None - the OS owns the experience                         | Full: lighting, physics, particles, events       | Basic model placement                                                 | Web-side only; AR hand-off is still Quick Look / Scene Viewer |
| Runtime dependencies | None                                                      | Full rendering engine                            | ARKit + Sceneform (Android SDK deprecated by Google)                  | WebView + web runtime                                         |
| New Architecture     | Built as a Turbo Module, 0.76+                            | Supported                                        | Predates it (last release 2023)                                       | N/A                                                           |
| Maintenance          | Active                                                    | Active (ReactVision community)                   | Last published March 2023                                             | Active (Google, web project)                                  |
| Best for             | A "View in AR" button for product/model previews          | Custom AR experiences, games, interactive scenes | -                                                                     | Reusing an existing web 3D pipeline                           |

**Honest guidance:** if you need to control the AR scene - anchors, gestures
you define, custom rendering - use ViroReact; this library cannot do that
by design. If all you need is "show this product in the user's room", the
system viewers give you Apple's and Google's own AR UX (occlusion, people
occlusion, quick placement) for free, and this library is the thinnest
possible path to them.

## Why this library

- **Zero runtime dependencies** - one small Turbo Module, nothing else in your bundle or your native build.
- **The platform's own AR UX** - rendering and interaction are maintained by Apple and Google, so they improve with every OS release without a library update.
- **Robust by contract** - stable error codes, iOS downloads are validated (a 200 response that isn't a real USDZ is rejected, never cached) and cached for instant re-opens.
- **Tested native code** - the iOS and Android implementations ship with native unit test suites covering the end-user scenarios (downloads, caching, failures, re-entry).
- **Expo-friendly** - works in development builds with no config plugin needed.

## Example app

The [example](./example) is an Expo app (SDK 57). AR requires a physical
device:

```sh
yarn
yarn example ios --device
yarn example android --device
```

## Contributing

See the [contributing guide](CONTRIBUTING.md) to learn how to contribute
to the repository and the development workflow.

## License

MIT
