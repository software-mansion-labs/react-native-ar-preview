import type { ImageSourcePropType } from 'react-native';
import type { ModelSource } from 'react-native-ar-preview';

import astronaut from '../assets/images/astronaut.png';

export type ExampleModel = {
  name: string;
  image: ImageSourcePropType;
  source: ModelSource;
};

export const MODEL: ExampleModel = {
  name: 'Astronaut',
  image: astronaut,
  source: {
    usdz: 'https://modelviewer.dev/shared-assets/models/Astronaut.usdz',
    glb: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
  },
};
