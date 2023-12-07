import { Shader } from './shader';

import diffuse_fragment from './diffuseGeneration.frag';
import diffuse_vertex from './Generation.vert';

export class DiffuseShader extends Shader {
    public constructor() {
      super(diffuse_vertex, diffuse_fragment);
    }
  }
  