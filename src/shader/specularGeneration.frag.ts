export default `
precision highp float;

uniform sampler2D texture_env;

in vec4 worldPosition;

uniform float roughness;

out vec4 outFragColor;

const float M_PI = 3.1415926535897932384626433832795;

// Convert a unit cartesian vector to polar coordinates
vec2 cartesianToPolar(vec3 cartesian) {
    // Compute azimuthal angle, in [-PI, PI]
    float phi = atan(cartesian.z, cartesian.x);
    // Compute polar angle, in [-PI/2, PI/2]
    float theta = asin(cartesian.y);
    return vec2(phi, theta);
}

// Convert a unit polar vector to cartesian coordinates
vec3 polarToCartesian(vec2 uv) {
    float theta = uv.x; // angle in radians
    float r = uv.y;     // radius

    float x = r * cos(theta);
    float y = r * sin(theta);
    //float z = sqrt(1.0 - x * x - y * y);
    float z = 0.0;

    return vec3(x, y, z);
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

float RadicalInverse_VdC(uint bits) 
{
    bits = (bits << 16u) | (bits >> 16u);
    bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
    bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
    bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
    bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
    return float(bits) * 2.3283064365386963e-10;
}

vec2 Hammersley(uint i, uint N)
{
    return vec2(float(i)/float(N), RadicalInverse_VdC(i));
}  

vec3 ImportanceSampleGGX(vec2 Xi, vec3 N, float roughness)
{
    float a = roughness*roughness;
	
    float phi = 2.0 * M_PI * Xi.x;
    float cosTheta = sqrt((1.0 - Xi.y) / (1.0 + (a*a - 1.0) * Xi.y));
    float sinTheta = sqrt(1.0 - cosTheta*cosTheta);

    vec3 H;
    H.x = cos(phi) * sinTheta;
    H.y = sin(phi) * sinTheta;
    H.z = cosTheta;
	
    vec3 up        = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
    vec3 tangent   = normalize(cross(up, N));
    vec3 bitangent = cross(N, tangent);
	
    vec3 sampleVec = tangent * H.x + bitangent * H.y + N * H.z;
    return normalize(sampleVec);
}

vec4 PrefilterEnvMap(vec3 N, float roughness)
{
    vec3 acc = vec3(0.0);

    vec3 R = N;
    vec3 V = R;

    const uint sampleCount = 1024u;
    float totalWeight = 0.0;
    for(uint i = 0u; i < sampleCount; i++)
    {
        vec2 Xi = Hammersley(i, sampleCount);
        vec3 H = ImportanceSampleGGX(Xi, N, roughness);
        vec3 L = normalize(2.0 * dot(V, H) * H - V);

        float NdotL = max(dot(N, L), 0.0);
        if (NdotL > 0.0)
        {
            float D = D_GGX(N, H, roughness);
            float NdotH = max(dot(N, H), 0.0);
            float HdotV = max(dot(H, V), 0.0);
            float pdf = D * NdotH / (4.0 * HdotV) + 0.0001;

            float resolution = 512.0;
            float saTexel = 4.0 * M_PI / (6.0 * resolution * resolution);
            float saSample = 1.0 / (float(sampleCount) * pdf + 0.0001);

            float mipLevel = roughness == 0.0 ? 0.0 : 0.5 * log2(saSample / saTexel);

            acc += textureLod(texture_env, cartesianToPolar(L), mipLevel).rgb * NdotL;
            totalWeight += NdotL;
        }
    }

    acc = acc / totalWeight;

    return vec4(acc, 1.0);
}

void main()
{
    vec2 uv = ((worldPosition.xy / worldPosition.w) + 1.0) * 0.5;
    vec3 N = polarToCartesian(uv);

    outFragColor.rgba = PrefilterEnvMap(N, roughness);
}
`;