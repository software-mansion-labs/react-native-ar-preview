import { act, create } from 'react-test-renderer';
import NativeArPreview from '../NativeArPreview';
import { useIsARAvailable } from '../index';

jest.mock('../NativeArPreview');

const mockIsARAvailable = jest.mocked(NativeArPreview.isARAvailable);

const renderAvailabilityValues = () => {
  const values: boolean[] = [];
  const Probe = () => {
    values.push(useIsARAvailable());
    return null;
  };
  act(() => {
    create(<Probe />);
  });
  return values;
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useIsARAvailable', () => {
  it('returns the availability synchronously on the first render', () => {
    mockIsARAvailable.mockReturnValue(true);

    expect(renderAvailabilityValues()).toEqual([true]);
    expect(mockIsARAvailable).toHaveBeenCalledTimes(1);
  });

  it('returns false when the availability check throws', () => {
    mockIsARAvailable.mockImplementation(() => {
      throw new Error('Native failure');
    });

    expect(renderAvailabilityValues()).toEqual([false]);
  });
});
