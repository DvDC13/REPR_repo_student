export default `
precision highp float;

#define USE_UV

out vec4 outFragColor;

#ifdef USE_UV
  in vec2 vUv;
  uniform sampler2D vTexture;
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

const float M_PI = 3.1415926535897932384626433832795;

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
#ifdef USE_UV
  albedo = texture(vTexture, vUv).rgb;
#else
  albedo = sRGBToLinear(vec4(uMaterial.albedo, 1.0)).rgb;
#endif

  vec3 N = normalize(vWsNormal);
  vec3 V = normalize(camPosition - worldPosition);

  vec3 irradiance = vec3(0.0);
  for (int i = 0; i < POINT_LIGHT_COUNT; i++)
  {
    vec3 L = normalize(uLight[i].position - worldPosition);
    vec3 H = normalize(V + L);

    float D = D_GGX(N, H, roughness);

    vec3 F0 = mix(vec3(0.04), albedo, metallic);
    vec3 F = F_Schlick(max(dot(H, V), 0.0), F0);

    float G = G_Smith(N, V, L, roughness);

    vec3 numerator = D * F * G;
    float denominator = 4.0 * max(dot(N, V), 0.0) * max(dot(N, L), 0.0);

    vec3 specular = numerator / max(denominator, 0.001);

    vec3 kS = F;
    vec3 kD = vec3(1.0) - kS;
    kD *= 1.0 - metallic;

    float costTheta = max(dot(N, L), 0.0);

    vec3 diffuse = kD * Diffuse_Lambert(albedo);
    
    irradiance += (diffuse + specular) * uLight[i].color * uLight[i].intensity * costTheta;
  }

  outFragColor.rgba = LinearTosRGB(vec4(irradiance, 1.0));
}
`;