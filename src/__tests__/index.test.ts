import { Platform } from 'react-native';

const mockOpenAR = jest.fn<Promise<void>, [string, string?, string?]>();
const mockIsARAvailable = jest.fn<Promise<boolean>, []>();

jest.mock('../NativeArPreview', () => ({
  __esModule: true,
  default: {
    openAR: (...args: [string, string?, string?]) => mockOpenAR(...args),
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

  it('rejects with E_INVALID_SOURCE for plain http usdz urls', async () => {
    await expect(
      openAR({ usdz: 'http://example.com/model.usdz' })
    ).rejects.toMatchObject({ code: ErrorCodes.INVALID_SOURCE });
    expect(mockOpenAR).not.toHaveBeenCalled();
  });

  it('rejects with E_INVALID_SOURCE for unknown usdz schemes', async () => {
    await expect(
      openAR({ usdz: 'ftp://example.com/model.usdz' })
    ).rejects.toMatchObject({ code: ErrorCodes.INVALID_SOURCE });
    expect(mockOpenAR).not.toHaveBeenCalled();
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

describe('openAR viewer options on iOS', () => {
  beforeEach(() => setPlatform('ios'));

  it('calls the native module with exactly one argument when no options are given', async () => {
    await openAR({ usdz: 'https://example.com/model.usdz' });
    expect(mockOpenAR).toHaveBeenCalledTimes(1);
    expect(mockOpenAR).toHaveBeenCalledWith('https://example.com/model.usdz');
  });

  it('passes scale and link through to the native module', async () => {
    await openAR(
      { usdz: 'https://example.com/model.usdz' },
      { scale: 'fixed', link: 'https://shop.example.com/chair' }
    );
    expect(mockOpenAR).toHaveBeenCalledTimes(1);
    expect(mockOpenAR).toHaveBeenCalledWith(
      'https://example.com/model.usdz',
      'fixed',
      'https://shop.example.com/chair'
    );
  });

  it('passes a lone scale option with an undefined link', async () => {
    await openAR({ usdz: 'https://example.com/model.usdz' }, { scale: 'auto' });
    expect(mockOpenAR).toHaveBeenCalledWith(
      'https://example.com/model.usdz',
      'auto',
      undefined
    );
  });

  it('passes a lone link option with an undefined scale', async () => {
    await openAR(
      { usdz: 'https://example.com/model.usdz' },
      { link: 'https://shop.example.com/chair' }
    );
    expect(mockOpenAR).toHaveBeenCalledWith(
      'https://example.com/model.usdz',
      undefined,
      'https://shop.example.com/chair'
    );
  });

  it.each(['http://shop.example.com/chair', '', 'not-a-url', 'file:///page'])(
    'rejects with E_INVALID_OPTIONS for link %j without calling native',
    async (link) => {
      await expect(
        openAR({ usdz: 'https://example.com/model.usdz' }, { link })
      ).rejects.toMatchObject({ code: ErrorCodes.INVALID_OPTIONS });
      expect(mockOpenAR).not.toHaveBeenCalled();
    }
  );
});

describe('openAR viewer options on Android', () => {
  beforeEach(() => setPlatform('android'));

  it('passes scale and link through to the native module', async () => {
    await openAR(
      { glb: 'https://example.com/model.glb' },
      { scale: 'fixed', link: 'https://shop.example.com/chair' }
    );
    expect(mockOpenAR).toHaveBeenCalledWith(
      'https://example.com/model.glb',
      'fixed',
      'https://shop.example.com/chair'
    );
  });

  it.each(['http://shop.example.com/chair', '', 'not-a-url', 'file:///page'])(
    'rejects with E_INVALID_OPTIONS for link %j without calling native',
    async (link) => {
      await expect(
        openAR({ glb: 'https://example.com/model.glb' }, { link })
      ).rejects.toMatchObject({ code: ErrorCodes.INVALID_OPTIONS });
      expect(mockOpenAR).not.toHaveBeenCalled();
    }
  );

  it('rejects with E_INVALID_SOURCE before validating options', async () => {
    await expect(
      openAR({ glb: 'http://example.com/model.glb' }, { link: 'not-a-url' })
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
  it('exports the five stable codes', () => {
    expect(ErrorCodes).toEqual({
      INVALID_SOURCE: 'E_INVALID_SOURCE',
      INVALID_OPTIONS: 'E_INVALID_OPTIONS',
      DOWNLOAD_FAILED: 'E_DOWNLOAD_FAILED',
      AR_UNAVAILABLE: 'E_AR_UNAVAILABLE',
      LAUNCH_FAILED: 'E_LAUNCH_FAILED',
    });
  });
});
