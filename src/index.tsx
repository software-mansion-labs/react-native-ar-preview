import { Platform } from 'react-native';
import NativeArPreview from './NativeArPreview';

export type ModelSource = {
  usdz?: string;
  glb?: string;
};

export const ErrorCodes = {
  INVALID_SOURCE: 'E_INVALID_SOURCE',
  DOWNLOAD_FAILED: 'E_DOWNLOAD_FAILED',
  AR_UNAVAILABLE: 'E_AR_UNAVAILABLE',
  LAUNCH_FAILED: 'E_LAUNCH_FAILED',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

const reject = (code: ErrorCode, message: string): Promise<never> => {
  const error = new Error(message) as Error & { code: ErrorCode };
  error.code = code;
  return Promise.reject(error);
};

const selectUrl = (source: ModelSource): Promise<string> => {
  if (Platform.OS === 'ios') {
    if (!source.usdz) {
      return reject(
        ErrorCodes.INVALID_SOURCE,
        'iOS requires a `usdz` url in the model source'
      );
    }
    return Promise.resolve(source.usdz);
  }
  if (Platform.OS === 'android') {
    if (!source.glb) {
      return reject(
        ErrorCodes.INVALID_SOURCE,
        'Android requires a `glb` url in the model source'
      );
    }
    if (!source.glb.startsWith('https://')) {
      return reject(
        ErrorCodes.INVALID_SOURCE,
        'Scene Viewer requires the `glb` url to be served over https'
      );
    }
    return Promise.resolve(source.glb);
  }
  return reject(
    ErrorCodes.AR_UNAVAILABLE,
    `AR preview is not available on ${Platform.OS}`
  );
};

export const openAR = (source: ModelSource): Promise<void> =>
  selectUrl(source).then((url) => NativeArPreview.openAR(url));

export const isARAvailable = (): Promise<boolean> => {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return Promise.resolve(false);
  }
  return NativeArPreview.isARAvailable();
};
