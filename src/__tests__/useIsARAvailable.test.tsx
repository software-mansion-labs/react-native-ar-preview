import { act, create } from 'react-test-renderer';
import NativeArPreview from '../NativeArPreview';
import { useIsARAvailable } from '../index';

jest.mock('../NativeArPreview');

const mockIsARAvailable = jest.mocked(NativeArPreview.isARAvailable);

const renderAvailabilityValues = async () => {
  const values: Array<boolean | null> = [];
  const Probe = () => {
    values.push(useIsARAvailable());
    return null;
  };
  await act(async () => {
    create(<Probe />);
  });
  return values;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useIsARAvailable', () => {
  it('returns null while checking and then the resolved availability', async () => {
    mockIsARAvailable.mockResolvedValue(true);

    await expect(renderAvailabilityValues()).resolves.toEqual([null, true]);
    expect(mockIsARAvailable).toHaveBeenCalledTimes(1);
  });

  it('resolves to false when the availability check rejects', async () => {
    mockIsARAvailable.mockRejectedValue(new Error('Native failure'));

    await expect(renderAvailabilityValues()).resolves.toEqual([null, false]);
  });
});
