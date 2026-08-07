import { Platform } from 'react-native';
import NativeArPreview from './NativeArPreview';

export type ModelSource =
  { usdz: string; glb?: string } | { usdz?: string; glb: string };

export type ViewerOptions = {
  scale?: 'auto' | 'fixed';
  link?: string;
};

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

export const isARAvailable = (): Promise<boolean> => {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return Promise.resolve(false);
  }
  return NativeArPreview.isARAvailable();
};
