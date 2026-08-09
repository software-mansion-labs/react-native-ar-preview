export default {
  openAR: jest.fn<Promise<void>, [string, string?, string?]>(),
  isARAvailable: jest.fn<boolean, []>(),
};
