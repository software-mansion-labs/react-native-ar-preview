import { Platform } from 'react-native';

const mockOpenAR = jest.fn<Promise<void>, [string]>();
const mockIsARAvailable = jest.fn<Promise<boolean>, []>();

jest.mock('../NativeArPreview', () => ({
  __esModule: true,
  default: {
    openAR: (url: string) => mockOpenAR(url),
    isARAvailable: () => mockIsARAvailable(),
  },
}));

import { ErrorCodes, isARAvailable, openAR } from '../index';

const setPlatform = (os: typeof Platform.OS) => {
  Object.defineProperty(Platform, 'OS', { get: () => os });
};

beforeEach(() => {
  jest.clearAllMocks();
  mockOpenAR.mockResolvedValue(undefined);
  mockIsARAvailable.mockResolvedValue(true);
});

describe('openAR on iOS', () => {
  beforeEach(() => setPlatform('ios'));

  it('passes the usdz url to the native module', async () => {
    await openAR({ usdz: 'https://example.com/model.usdz' });
    expect(mockOpenAR).toHaveBeenCalledWith('https://example.com/model.usdz');
  });

  it('accepts file:// urls', async () => {
    await openAR({ usdz: 'file:///models/model.usdz' });
    expect(mockOpenAR).toHaveBeenCalledWith('file:///models/model.usdz');
  });

  it('rejects with E_INVALID_SOURCE when usdz is missing', async () => {
    await expect(
      openAR({ glb: 'https://example.com/model.glb' })
    ).rejects.toMatchObject({ code: ErrorCodes.INVALID_SOURCE });
    expect(mockOpenAR).not.toHaveBeenCalled();
  });
});

describe('openAR on Android', () => {
  beforeEach(() => setPlatform('android'));

  it('passes the glb url to the native module', async () => {
    await openAR({ glb: 'https://example.com/model.glb' });
    expect(mockOpenAR).toHaveBeenCalledWith('https://example.com/model.glb');
  });

  it('rejects with E_INVALID_SOURCE when glb is missing', async () => {
    await expect(
      openAR({ usdz: 'https://example.com/model.usdz' })
    ).rejects.toMatchObject({ code: ErrorCodes.INVALID_SOURCE });
    expect(mockOpenAR).not.toHaveBeenCalled();
  });

  it('rejects with E_INVALID_SOURCE for file:// glb urls', async () => {
    await expect(
      openAR({ glb: 'file:///models/model.glb' })
    ).rejects.toMatchObject({ code: ErrorCodes.INVALID_SOURCE });
    expect(mockOpenAR).not.toHaveBeenCalled();
  });

  it('rejects with E_INVALID_SOURCE for plain http glb urls', async () => {
    await expect(
      openAR({ glb: 'http://example.com/model.glb' })
    ).rejects.toMatchObject({ code: ErrorCodes.INVALID_SOURCE });
    expect(mockOpenAR).not.toHaveBeenCalled();
  });
});

describe('openAR on unsupported platforms', () => {
  it('rejects with E_AR_UNAVAILABLE', async () => {
    setPlatform('web');
    await expect(
      openAR({
        usdz: 'https://example.com/model.usdz',
        glb: 'https://example.com/model.glb',
      })
    ).rejects.toMatchObject({ code: ErrorCodes.AR_UNAVAILABLE });
    expect(mockOpenAR).not.toHaveBeenCalled();
  });
});

describe('isARAvailable', () => {
  it('delegates to the native module on ios', async () => {
    setPlatform('ios');
    await expect(isARAvailable()).resolves.toBe(true);
    expect(mockIsARAvailable).toHaveBeenCalled();
  });

  it('resolves false on unsupported platforms without calling native', async () => {
    setPlatform('web');
    await expect(isARAvailable()).resolves.toBe(false);
    expect(mockIsARAvailable).not.toHaveBeenCalled();
  });
});

describe('ErrorCodes', () => {
  it('exports the four stable codes', () => {
    expect(ErrorCodes).toEqual({
      INVALID_SOURCE: 'E_INVALID_SOURCE',
      DOWNLOAD_FAILED: 'E_DOWNLOAD_FAILED',
      AR_UNAVAILABLE: 'E_AR_UNAVAILABLE',
      LAUNCH_FAILED: 'E_LAUNCH_FAILED',
    });
  });
});
