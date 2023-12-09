export default `

precision highp float;

in vec3 in_position;

out vec3 worldPosition;

vec2 uvs[] = {
        vec2(0.0, 0.0),
        vec2(0.0, 2.0),
        vec2(2.0, 0.0),
    };

void main()
{
  vec4 positionLocal = vec4(in_position, 1.0);

  gl_Position = vec4((uvs[gl_VertexID] * 2.0 - 1.0), 0.0, 1.0);

  worldPosition = positionLocal.xyz;
}
`;
