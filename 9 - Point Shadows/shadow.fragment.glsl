#version 300 es
precision mediump float;

uniform vec3 uLightDirection;

in vec3 vNormal;
in vec4 positionFromLightPov;

uniform mediump sampler2DShadow shadowMap;
uniform mediump samplerCubeShadow shadowMap2;

out vec3 fragColor;

float ambientLight = 0.2;

vec2 adjacentPixels[5] = vec2[](
vec2(0, 0),
vec2(-1, 0),
vec2(1, 0),
vec2(0, 1),
vec2(0, -1)
);

vec3 color = vec3(1.0, 1.0, 1.0);

float visibility = 1.0;
float shadowSpread = 800.0;

void main()
{
    for (int i = 0; i < 5; i++) {
        vec3 samplePosition = vec3(positionFromLightPov.xy + adjacentPixels[i]/shadowSpread, positionFromLightPov.z);
        float hitByLight = texture(shadowMap, samplePosition);
        visibility *= max(hitByLight, 0.87);
    }

    vec3 normalizedNormal = normalize(vNormal);
    float lightCos = dot(uLightDirection, normalizedNormal);
    float brightness = max(lightCos * visibility, ambientLight);
    fragColor = color * brightness;
}
