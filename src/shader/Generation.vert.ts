export default `

precision highp float;

in vec3 in_position;

out vec3 worldPosition;

void main()
{
  vec4 positionLocal = vec4(in_position, 1.0);
  gl_Position = positionLocal;

  worldPosition = positionLocal.xyz;
}
`;
