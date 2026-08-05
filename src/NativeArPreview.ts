import { TurboModuleRegistry, type TurboModule } from 'react-native';

export interface Spec extends TurboModule {
  openAR(url: string): Promise<void>;
  isARAvailable(): Promise<boolean>;
}

export default TurboModuleRegistry.getEnforcing<Spec>('ArPreview');
