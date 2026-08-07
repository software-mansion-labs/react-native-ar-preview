# react-native-ar-preview example

An Expo app (SDK 57, expo-router) demonstrating
[react-native-ar-preview](../README.md): a gallery of sample 3D models,
each opening in the platform's native AR viewer - AR Quick Look on iOS,
Scene Viewer on Android.

## Running it

AR needs real camera and motion sensors, so run on a **physical device**
(simulators fall back to the non-AR 3D object view at best). The library
ships native code, so the app must be a development build - it will not
work in Expo Go.

From the repository root:

```sh
yarn
yarn example ios --device
yarn example android --device
```

On Android the device also needs
[Google Play Services for AR](https://play.google.com/store/apps/details?id=com.google.ar.core)
installed.

## What to look at

- [`src/app/index.tsx`](./src/app/index.tsx) - the model gallery screen; shows calling `openAR()` and handling its error codes.
- [`src/models.ts`](./src/models.ts) - sample models with the USDZ/GLB URL pair each platform needs.
- [`src/components/ModelCard.tsx`](./src/components/ModelCard.tsx) - the "View in AR" entry point per model.
