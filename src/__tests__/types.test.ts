jest.mock('../NativeArPreview', () => ({
  __esModule: true,
  default: {
    openAR: jest.fn(),
    isARAvailable: jest.fn(),
  },
}));

import { openAR } from '../index';

const typeChecks = () => [
  openAR({ usdz: 'https://example.com/model.usdz' }),
  openAR({ glb: 'https://example.com/model.glb' }),
  openAR({
    usdz: 'https://example.com/model.usdz',
    glb: 'https://example.com/model.glb',
  }),
  // @ts-expect-error - a model source must carry at least one format
  openAR({}),
  openAR(
    { usdz: 'https://example.com/model.usdz' },
    { scale: 'fixed', link: 'https://shop.example.com/chair' }
  ),
  openAR({ usdz: 'https://example.com/model.usdz' }, {}),
  // @ts-expect-error - scale accepts only 'auto' or 'fixed'
  openAR({ usdz: 'https://example.com/model.usdz' }, { scale: 'locked' }),
  // @ts-expect-error - unknown options are rejected
  openAR({ usdz: 'https://example.com/model.usdz' }, { title: 'Chair' }),
];

describe('ModelSource and ViewerOptions types', () => {
  it('keeps the compile-time contract exercised by the checks above', () => {
    expect(typeof typeChecks).toBe('function');
  });
});
