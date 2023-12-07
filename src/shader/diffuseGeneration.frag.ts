export default `
precision highp float;

uniform sampler2D diffuse_gen_texture;

in vec3 worldPosition;

out vec4 outFragColor;

void main()
{
    vec3 color = texture(diffuse_gen_texture, worldPosition.xy).rgb;
    outFragColor = vec4(color, 1.0);
}

`;