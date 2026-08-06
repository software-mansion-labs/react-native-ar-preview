import { Platform } from 'react-native';

export const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

export const FORMAT = Platform.OS === 'ios' ? 'USDZ' : 'GLB';
export const VIEWER = Platform.OS === 'ios' ? 'AR Quick Look' : 'Scene Viewer';
