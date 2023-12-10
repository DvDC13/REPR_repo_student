import { Shader } from './shader';

import specular_fragment from './specularGeneration.frag';
import specular_vertex from './Generation.vert';

export class SpecularShader extends Shader {
    public constructor() {
      super(specular_vertex, specular_fragment);
    }
  }
  