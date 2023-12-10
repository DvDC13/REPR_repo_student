export default `
precision highp float;

uniform sampler2D texture_env;

in vec3 worldPosition;

out vec4 outFragColor;

const float M_PI = 3.1415926535897932384626433832795;

void main()
{
    vec3 N = normalize(worldPosition);

    vec3 irradiance = vec3(0.0);

    vec3 up    = vec3(0.0, 1.0, 0.0);
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

            irradiance += texture(texture_env, direction.xy * 0.5 + 0.5).rgb * cos(theta) * sin(theta);
            count++;
        }
    }

    irradiance = M_PI * irradiance * (1.0 / float(count));

    outFragColor = vec4(irradiance, 1.0);
}

`;