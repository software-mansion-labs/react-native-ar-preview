import { Platform } from 'react-native';
import NativeArPreview from './NativeArPreview';

type ModelFormats = {
  /**
   * The model for iOS, shown in AR Quick Look.
   * `https://` URLs are downloaded, validated as USDZ, and cached on the
   * device (keyed by URL - change the URL when the model changes).
   * `file://` URLs open directly.
   */
  usdz?: string;
  /**
   * The model for Android, shown in Scene Viewer.
   * Must be an `https://` URL - Scene Viewer downloads it itself and
   * cannot open local files.
   */
  glb?: string;
};

/**
 * The model to preview, keyed by format. At least one format is required.
 * A source missing the format the current platform needs rejects with
 * `E_INVALID_SOURCE`.
 */
export type ModelSource = ModelFormats & ({ usdz: string } | { glb: string });

/**
 * Cross-platform presentation options for the system AR viewer. Each
 * platform translates them into its own viewer parameters.
 */
export type ViewerOptions = {
  /**
   * `'fixed'` locks the model to its real-world size, so the user cannot
   * pinch-scale it in AR mode. `'auto'` (default) keeps the platform
   * behavior. iOS: `allowsContentScaling`; Android: `resizable=false`.
   */
  scale?: 'auto' | 'fixed';
  /**
   * The product web page for this model. Must be an `https://` URL,
   * otherwise `openAR` rejects with `E_INVALID_OPTIONS`.
   * Android: shown as a tappable link in Scene Viewer. iOS: the Quick Look
   * share sheet shares this page instead of the raw model file (broken on
   * iOS 26 by an OS regression - google/model-viewer#4770).
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
 * Opens the system AR viewer for the given model - AR Quick Look on iOS,
 * Scene Viewer on Android.
 *
 * Resolves once the viewer is on screen; closing the viewer is not
 * reported. Calling again while an earlier open is still in flight is a
 * silent no-op. Rejects with an `Error` carrying a `code` from
 * {@link ErrorCodes}.
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
 * Whether this device can show an AR preview - ARKit world tracking on
 * iOS, a resolvable Scene Viewer on Android, always `false` elsewhere.
 * Use it to hide the AR button on devices that cannot show AR.
 */
export const isARAvailable = (): Promise<boolean> => {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return Promise.resolve(false);
  }
  return NativeArPreview.isARAvailable();
};
