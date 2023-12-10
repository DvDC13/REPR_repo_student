export default `
precision highp float;

uniform sampler2D texture_env;

in vec4 worldPosition;

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
    float z = sqrt(1.0 - x * x - y * y);

    return vec3(x, y, z);
}

void main()
{
    vec2 uv = ((worldPosition.xy / worldPosition.w) + 1.0) * 0.5;
    vec3 N = polarToCartesian(uv);

    vec3 irradiance = vec3(0.0);

    vec3 up    = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
    vec3 right = normalize(cross(up, N));
    up         = normalize(cross(N, right));

    float sampleDelta = 0.25;
    float count = 0.0;

    for(float phi = 0.0; phi < 2.0 * M_PI; phi += sampleDelta)
    {
        for(float theta = 0.0; theta < 0.5 * M_PI; theta += sampleDelta)
        {
            vec3 tangentSample = vec3(sin(theta) * cos(phi),  sin(theta) * sin(phi), cos(theta));
            vec3 direction = tangentSample.x * right + tangentSample.y * up + tangentSample.z * N;

            irradiance += texture(texture_env, cartesianToPolar(direction)).rgb * cos(theta) * sin(theta);
            count++;
        }
    }

    irradiance = M_PI * irradiance * (1.0 / float(count));

    outFragColor = vec4(irradiance, 1.0);
}

`;