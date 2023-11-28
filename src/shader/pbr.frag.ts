export default `
precision highp float;

#define USE_UV

out vec4 outFragColor;

const float M_PI = 3.1415926535897932384626433832795;

#ifdef USE_UV
  in vec2 vUv;
  uniform sampler2D brdfPreInt;
  uniform sampler2D prefilteredDiffuse;
  uniform sampler2D prefilteredSpecular;
#endif

in vec3 vWsNormal;
in vec3 camPosition;
in vec3 worldPosition;

uniform float roughness;
uniform float metallic;

struct PointLight
{
  vec3 position;
  vec3 color;
  float intensity;
};
uniform PointLight uLight[POINT_LIGHT_COUNT];

struct Material
{
  vec3 albedo;
};
uniform Material uMaterial;

// From three.js
vec4 sRGBToLinear( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}

// From three.js
vec4 LinearTosRGB( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}

// Convert a unit cartesian vector to polar coordinates
vec2 cartesianToPolar(vec3 cartesian) {
    // Compute azimuthal angle, in [-PI, PI]
    float phi = atan(cartesian.z, cartesian.x);
    // Compute polar angle, in [-PI/2, PI/2]
    float theta = asin(cartesian.y);
    return vec2(phi, theta);
}

float MaxRange = 7.0;
// Convert from RGBM to linear
vec3 DecodeRGBM(vec4 rgbm)
{
    return rgbm.rgb * (rgbm.a * MaxRange);
}

// Convert polar to equirectangular coordinates
vec2 polarToEquirectangular(vec2 polar)
{
  return vec2(
    polar.x / (2.0 * M_PI) + 0.5,
    polar.y / M_PI + 0.5
  );
}

vec3 computeUVFromRoughness(vec3 reflected, float roughness)
{
  vec2 polar_reflected = cartesianToPolar(reflected);

  vec2 uv_texture1 = polarToEquirectangular(polar_reflected);
  vec2 uv_texture2 = polarToEquirectangular(polar_reflected);

  float lvl1 = floor(roughness * 5.0);
  float lvl2 = ceil(roughness * 5.0);

  uv_texture1.x = mix(0.0, pow(0.5, lvl1), uv_texture1.x);
  uv_texture1.y = mix(1.0 - pow(0.5, lvl1), 1.0 - pow(0.5, lvl2), uv_texture1.y);

  uv_texture2.x = mix(0.0, pow(0.5, lvl2), uv_texture2.x);
  uv_texture2.y = mix(1.0 - pow(0.5, lvl2), 1.0 - pow(0.5, lvl2 + 1.0), uv_texture2.y);

  vec3 prefilteredColor_1 = DecodeRGBM(texture(prefilteredSpecular, uv_texture1));
  vec3 prefilteredColor_2 = DecodeRGBM(texture(prefilteredSpecular, uv_texture2));

  vec3 prefilteredColor = mix(prefilteredColor_1, prefilteredColor_2, roughness * 5.0 - lvl1);

  return prefilteredColor;
}

vec3 Diffuse_Lambert(vec3 albedo)
{
  return albedo / M_PI;
}

float D_GGX(vec3 N, vec3 H, float roughness)
{
  float a = roughness * roughness;
  float a2 = a * a;
  float NoH = max(dot(N, H), 0.0);
  float NoH2 = NoH * NoH;
  
  float nom = a2;
  float denom = (NoH2 * (a2 - 1.0) + 1.0);

  return nom / (M_PI * denom * denom);
}

vec3 F_Schlick(float cosTheta, vec3 F0)
{
    return F0 + (vec3(1.0) - F0) * pow(1.0 - cosTheta, 5.0);
}

float GeometrySchlickGGX(float NdotV, float roughness)
{
    float r = (roughness + 1.0);
    float k = (r * r) / 8.0;

    float nom = NdotV;
    float denom = NdotV * (1.0 - k) + k;

    return nom / denom;
}

float G_Smith(vec3 N, vec3 V, vec3 L, float roughness)
{
    float NdotV = max(dot(N, V), 0.0);
    float NdotL = max(dot(N, L), 0.0);
    float ggx2 = GeometrySchlickGGX(NdotV, roughness);
    float ggx1 = GeometrySchlickGGX(NdotL, roughness);

    return ggx1 * ggx2;
}

void main()
{
  vec3 albedo;
  albedo = sRGBToLinear(vec4(uMaterial.albedo, 1.0)).rgb;

  vec3 N = normalize(vWsNormal);
  vec3 V = normalize(camPosition - worldPosition);

  vec3 irradiance = vec3(0.0);
  for (int i = 0; i < POINT_LIGHT_COUNT; i++)
  {
    vec3 L = normalize(uLight[i].position - worldPosition);
    vec3 H = normalize(V + L);

    vec3 F0 = mix(vec3(0.04), albedo, metallic);
    vec3 F = F_Schlick(max(dot(H, V), 0.0), F0);

    vec3 kS = F;
    vec3 kD = vec3(1.0) - kS;
    kD *= 1.0 - metallic;

    // Diffuse 
    vec3 diffuseBRDFEval = kD * albedo * DecodeRGBM(texture(prefilteredDiffuse, polarToEquirectangular(cartesianToPolar(N))));

    // Specular
    vec3 reflected = reflect(-V, N);

    vec3 prefilteredSpec = computeUVFromRoughness(reflected, roughness);

    vec2 brdf = texture(brdfPreInt, vec2(max(dot(N, V), 0.0), roughness)).xy;

    vec3 specularBRDFEval = prefilteredSpec * (kS * brdf.x + brdf.y);

    // Compute irradiance
    float costTheta = max(dot(N, L), 0.0);

    irradiance += (diffuseBRDFEval + specularBRDFEval) * uLight[i].color * uLight[i].intensity * costTheta;
  }

  outFragColor.rgba = LinearTosRGB(vec4(irradiance, 1.0));
}
`;