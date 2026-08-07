import { Platform } from 'react-native';
import NativeArPreview from './NativeArPreview';

type ModelFormats = {
  /**
   * The model file for iOS, shown in AR Quick Look.
   *
   * - `https://` URL: downloaded, checked to be a real USDZ, and cached on
   *   the device. The cache key is the URL - change the URL when the model
   *   changes.
   * - `file://` URL: opened directly.
   */
  usdz?: string;
  /**
   * The model file for Android, shown in Scene Viewer.
   *
   * Must be an `https://` URL. Scene Viewer downloads it itself and cannot
   * open local files.
   */
  glb?: string;
};

/**
 * The model to preview, one URL per format. At least one format is
 * required. If the current platform has no format, `openAR` rejects with
 * `E_INVALID_SOURCE`.
 */
export type ModelSource = ModelFormats & ({ usdz: string } | { glb: string });

/**
 * Options for how the AR viewer presents the model. The same options work
 * on both platforms.
 */
export type ViewerOptions = {
  /**
   * How the user may scale the model in AR mode. `'auto'` (default) allows
   * pinch to scale; `'fixed'` keeps the model at its real-world size.
   *
   * - iOS: `allowsContentScaling`
   * - Android: `resizable=false` in Scene Viewer
   */
  scale?: 'auto' | 'fixed';
  /**
   * The web page of the shown product. Must be an `https://` URL -
   * anything else rejects with `E_INVALID_OPTIONS`.
   *
   * - iOS: the Quick Look share sheet shares this page instead of the
   *   model file. Broken on iOS 26 (Apple regression,
   *   google/model-viewer#4770).
   * - Android: Scene Viewer shows the link next to the model.
   */
  link?: string;
};

/**
 * Stable error codes carried on the `code` property of errors rejected by
 * {@link openAR} and {@link isARAvailable}.
 */
export const ErrorCodes = {
  INVALID_SOURCE: 'E_INVALID_SOURCE',
  INVALID_OPTIONS: 'E_INVALID_OPTIONS',
  DOWNLOAD_FAILED: 'E_DOWNLOAD_FAILED',
  AR_UNAVAILABLE: 'E_AR_UNAVAILABLE',
  LAUNCH_FAILED: 'E_LAUNCH_FAILED',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

const rejectWithCode = (code: ErrorCode, message: string): Promise<never> => {
  const error = new Error(message) as Error & { code: ErrorCode };
  error.code = code;
  return Promise.reject(error);
};

const selectUrl = (source: ModelSource): Promise<string> => {
  if (Platform.OS === 'ios') {
    if (!source.usdz) {
      return rejectWithCode(
        ErrorCodes.INVALID_SOURCE,
        'iOS requires a `usdz` url in the model source'
      );
    }
    if (
      !source.usdz.startsWith('https://') &&
      !source.usdz.startsWith('file://')
    ) {
      return rejectWithCode(
        ErrorCodes.INVALID_SOURCE,
        'The `usdz` url must use the https or file scheme'
      );
    }
    return Promise.resolve(source.usdz);
  }
  if (Platform.OS === 'android') {
    if (!source.glb) {
      return rejectWithCode(
        ErrorCodes.INVALID_SOURCE,
        'Android requires a `glb` url in the model source'
      );
    }
    if (!source.glb.startsWith('https://')) {
      return rejectWithCode(
        ErrorCodes.INVALID_SOURCE,
        'Scene Viewer requires the `glb` url to be served over https'
      );
    }
    return Promise.resolve(source.glb);
  }
  return rejectWithCode(
    ErrorCodes.AR_UNAVAILABLE,
    `AR preview is not available on ${Platform.OS}`
  );
};

const validateOptions = (options: ViewerOptions): Promise<ViewerOptions> => {
  if (options.link !== undefined && !options.link.startsWith('https://')) {
    return rejectWithCode(
      ErrorCodes.INVALID_OPTIONS,
      `The \`link\` option must be an https url, got: ${options.link}`
    );
  }
  return Promise.resolve(options);
};

/**
 * Opens the system AR viewer for the given model.
 *
 * - iOS: AR Quick Look
 * - Android: Scene Viewer
 *
 * Resolves when the viewer is on screen. Closing the viewer is not
 * reported. A second call while one is already in flight resolves right
 * away and does nothing. Rejects with an `Error` that carries a `code`
 * from {@link ErrorCodes}.
 */
export const openAR = (
  source: ModelSource,
  options?: ViewerOptions
): Promise<void> =>
  selectUrl(source).then((url) => {
    if (options === undefined) {
      return NativeArPreview.openAR(url);
    }
    return validateOptions(options).then((validated) =>
      NativeArPreview.openAR(url, validated.scale, validated.link)
    );
  });

/**
 * Whether this device can show an AR preview.
 *
 * - iOS: the device supports ARKit world tracking.
 * - Android: the Scene Viewer intent can be resolved.
 * - Other platforms: always `false`.
 *
 * Use it to hide the AR button when AR is not available.
 */
export const isARAvailable = (): Promise<boolean> => {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return Promise.resolve(false);
  }
  return NativeArPreview.isARAvailable();
};
