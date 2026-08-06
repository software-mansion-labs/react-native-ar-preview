# react-native-ar-preview

View 3D models in the native AR viewer from React Native - the mobile
equivalent of [`<model-viewer>`](https://modelviewer.dev)'s "View in AR"
button.

- **iOS** - presents [AR Quick Look](https://developer.apple.com/augmented-reality/quick-look/)
  (`QLPreviewController`) with a USDZ model
- **Android** - launches [Scene Viewer](https://developers.google.com/ar/develop/scene-viewer)
  with a GLB model

The library deliberately does nothing else: no embedded AR view, no 3D
engine, no scene control. One call, the platform's own AR experience, zero
runtime dependencies.

## Requirements

- React Native **0.76+** with the **New Architecture** enabled (the default
  since 0.76). The old architecture is not supported.
- Works in bare React Native and in Expo **development builds** (`expo
prebuild` / `expo run`). Not compatible with Expo Go, since it ships
  native code.
- **iOS**: a device with ARKit support for the AR mode (Quick Look falls
  back to a 3D object view otherwise).
- **Android**: [Google Play Services for AR](https://play.google.com/store/apps/details?id=com.google.ar.core)
  installed on the device, and the GLB model reachable over **HTTPS**
  (Scene Viewer downloads it itself; local files are not supported).

## Installation

```sh
npm install react-native-ar-preview
```

Then rebuild your app (`pod install` happens automatically via autolinking;
Expo users run `npx expo prebuild` and a new development build).

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

- `usdz` - used on iOS. Remote `https://` URLs are downloaded and cached
  automatically (in `Caches/`, keyed by URL - version your URLs to bust
  the cache). `file://` URLs are opened directly.
- `glb` - used on Android. Must be an `https://` URL; Scene Viewer
  fetches it itself and cannot open local files.

A source may carry only one format; calling `openAR` on a platform whose
format is missing rejects with `E_INVALID_SOURCE`.

Android launches Scene Viewer in `ar_preferred` mode: devices with Scene
Viewer but without AR support still get the 3D fallback view.

### `isARAvailable(): Promise<boolean>`

- **iOS** - whether the device supports ARKit world tracking.
- **Android** - whether the Scene Viewer intent can be resolved.
- Any other platform - `false`.

### `ErrorCodes`

Rejections carry a `code` property with one of these stable values:

| Code                | Meaning                                                                  |
| ------------------- | ------------------------------------------------------------------------ |
| `E_INVALID_SOURCE`  | No format for the current platform, or a non-HTTPS `glb` URL on Android. |
| `E_DOWNLOAD_FAILED` | iOS could not download a usable USDZ file (network error, non-2xx status, or a response body that is not a USDZ archive). Nothing is cached in this case. |
| `E_AR_UNAVAILABLE`  | No system AR viewer on this device, or an unsupported platform.          |
| `E_LAUNCH_FAILED`   | The viewer could not be presented for another reason.                    |

## Model formats

Each platform consumes its own format - exactly like `<model-viewer>`'s
`src` / `ios-src` pair - so ship every model twice:

| Platform | Format | Notes                                        |
| -------- | ------ | -------------------------------------------- |
| iOS      | USDZ   | Downloaded by the library, cached on device. |
| Android  | GLB    | Fetched by Scene Viewer over HTTPS.          |

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
