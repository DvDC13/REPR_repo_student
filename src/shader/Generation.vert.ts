export default `

precision highp float;

in vec3 in_position;

uniform mat4 uModel;
uniform mat4 WsToCs;

out vec3 worldPosition;

void main()
{
  vec4 positionLocal = vec4(in_position, 1.0);
  gl_Position = WsToCs * uModel * positionLocal;

  worldPosition = (uModel * positionLocal).xyz;
}
`;
