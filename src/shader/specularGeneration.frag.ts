export default `
precision highp float;

uniform sampler2D texture_env;

in vec3 worldPosition;

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

// // Image based specular
// vec3 compute_specular(vec3 normal, float roughness)
// {
//   vec3 acc = vec3(0.0);
//   vec3 w0 = normal;
//   int N = 1000;
//   for(int i = 0; i < N; ++i)
//   {
//     vec2 xi = Hammersley(float(i), float(N));

//     vec3 direction = importanceSampleGGX(xi, roughness, normal, w0);
//     vec3 radiance = texture(texture_env, cartesianToPolar(direction)).rgb;
//     acc += radiance;
//   }
//   acc /= float(N);
//   return acc;
// }

// vec3 generate_mipmaps(vec2 uv)
// {
//   float level = min(8. - floor(log2(512. - gl_FragCoord.y)), 6.);

//   uv.y *= pow(2., level + 1.);
//   uv.x = mod(uv.x * pow(2., level), 1.);

//   return compute_specular(polarToCartesian(uv), min(level * 0.2, 1.));
// }

void main()
{
//   outFragColor.rgba = generate_mipmaps(worldPosition.xy);
    outFragColor.rgba = vec4(1.0);
}
`;