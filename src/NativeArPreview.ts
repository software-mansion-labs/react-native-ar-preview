import { TurboModuleRegistry, type TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  openAR(url: string, scale?: string, link?: string): Promise<void>;
  isARAvailable(): boolean;
}

export default TurboModuleRegistry.getEnforcing<Spec>('ArPreview');
