export default `

precision highp float;

#define USE_UV

in vec3 in_position;
in vec3 in_normal;

#ifdef USE_UV
  in vec2 in_uv;
#endif // USE_UV

/**
 * Varyings.
 */

out vec3 vWsNormal;
#ifdef USE_UV
  out vec2 vUv;
#endif // USE_UV

/**
 * Uniforms List
 */

struct Camera
{
  mat4 WsToCs; // World-Space to Clip-Space (proj * view)
  vec3 position;
};
uniform Camera uCamera;

out vec3 camPosition;
out vec3 worldPosition;

uniform mat4 uModel;

void main()
{
  vec4 positionLocal = vec4(in_position, 1.0);
  gl_Position = uCamera.WsToCs * uModel * positionLocal;
  
  vWsNormal = in_normal;
  camPosition = uCamera.position;
  worldPosition = in_position;

#ifdef USE_UV
  vUv = in_uv;
#endif // USE_UV
}
`;
