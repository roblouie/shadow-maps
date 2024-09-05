import {
  createCubeWithNormals,
  createLookAt, createOrtho,
  createPerspective,
  createProgram, normalize
} from '../helper-methods.js';

const spotlightDepthVertexShader = `#version 300 es

layout(location=0) in vec4 aPosition;

uniform mat4 lightPovMvp;

void main(){
  gl_Position = lightPovMvp * aPosition;
}
`;

const spotlightDepthFragmentShader = `#version 300 es
precision mediump float;

out float fragmentdepth;

void main(){
 fragmentdepth = gl_FragCoord.z;
}
`;

const vertexShaderSrc = `#version 300 es

layout(location=0) in vec4 aPosition;
layout(location=1) in vec3 aNormal;

uniform mat4 modelViewProjection;

uniform mat4 lightPovMvp;

out vec3 vNormal;
out vec3 vPosition;
out vec4 positionFromLightPov;

void main()
{
    vNormal = aNormal;
    gl_Position = modelViewProjection * aPosition;
    vPosition = aPosition.xyz;
    positionFromLightPov = lightPovMvp * aPosition;
}`;


const fragmentShaderSrc = `#version 300 es
precision mediump float;

uniform vec3 uSpotlightPosition;
uniform vec3 uSpotlightDirection;

uniform vec3 uPointLightPosition;

uniform mediump sampler2DShadow shadowMap;

in vec3 vPosition;
in vec3 vNormal;
in vec4 positionFromLightPov;

out vec3 fragColor;

float ambientLight = 0.2;
float lightInnerCutoff = 0.96;
float lightOuterCutoff = 0.75;

vec3 color = vec3(1.0, 1.0, 1.0);
vec3 spotlightColor = vec3(1.0, 0.0, 0.0);
vec3 pointLightColor = vec3(0.0, 0.0, 1.0);

void main()
{
  vec3 spotlightOffset = uSpotlightPosition - vPosition;
  vec3 surfaceToSpotlight = normalize(spotlightOffset);
  
  float spotlightDiffuse = max(0.0, dot(surfaceToSpotlight, normalize(vNormal)));
  float angleToSurface = dot(uSpotlightDirection, -surfaceToSpotlight);
  float spot = smoothstep(lightOuterCutoff, lightInnerCutoff, angleToSurface);

  float spotlightBrightness = spotlightDiffuse * spot;
  
  
  vec3 pointLightOffset = uPointLightPosition - vPosition;
  float pointLightDistance = length(pointLightOffset);
  vec3 pointLightDirection = normalize(pointLightOffset);
  
  float pointLightDiffuse = max(0.0, dot(pointLightDirection, normalize(vNormal)));
  float pointLightAttenuation = 1.0 / (pointLightDistance * pointLightDistance);
  float pointLightBrightness = pointLightDiffuse * pointLightAttenuation;
  
  vec3 pointLightColor = pointLightColor * pointLightBrightness;
  
  // SPOTLIGHT SHADOW
  float bias = 0.004;
  vec3 projCoords = positionFromLightPov.xyz / positionFromLightPov.w;
  vec3 biased = vec3(projCoords.xy, projCoords.z - bias);
  float hitBySpotlight = texture(shadowMap, biased);
  
  // FINAL LIGHTING
  vec3 litColor = spotlightColor * spotlightBrightness * hitBySpotlight + pointLightColor;
  
  fragColor = color * litColor;
}`;


const gl = document.querySelector('canvas').getContext('webgl2');

gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);

const origin = new DOMPoint(0, 0, 0);

const program = createProgram(gl, vertexShaderSrc, fragmentShaderSrc);
const depthProgram = createProgram(gl, spotlightDepthVertexShader, spotlightDepthFragmentShader);

// Setup Light
gl.useProgram(program);

// Point Light Position
const pointLightPosition = new DOMPoint(0.8, 1, -0.5);
const pointLightPositionLoc = gl.getUniformLocation(program,'uPointLightPosition');
gl.uniform3fv(pointLightPositionLoc, new Float32Array([pointLightPosition.x, pointLightPosition.y, pointLightPosition.z]));

// Spotlight Position
const lightPosition = new DOMPoint(-0.1, 0.8, 0.6);
const lightPositionLoc = gl.getUniformLocation(program,'uSpotlightPosition');
gl.uniform3fv(lightPositionLoc, new Float32Array([lightPosition.x, lightPosition.y, lightPosition.z]));

// Spotlight Direction
const lightDirection = normalize(new DOMPoint(0, -0.4, -0.2));
const lightDirectionLoc = gl.getUniformLocation(program, 'uSpotlightDirection');
gl.uniform3fv(lightDirectionLoc, new Float32Array([lightDirection.x, lightDirection.y, lightDirection.z]));

// Spotlight view mvp
const lightPovProj2 = createPerspective(Math.PI / 2, 1, 0.1, 20);
const lightPovView = createLookAt(lightPosition, origin);
const lightPovMvp = lightPovProj2.multiply(lightPovView);
const lightPovMvpDepthLocation = gl.getUniformLocation(depthProgram, 'lightPovMvp');
gl.useProgram(depthProgram);
gl.uniformMatrix4fv(lightPovMvpDepthLocation, false, lightPovMvp.toFloat32Array());


const textureSpaceConversion = new DOMMatrix([
  0.5, 0.0, 0.0, 0.0,
  0.0, 0.5, 0.0, 0.0,
  0.0, 0.0, 0.5, 0.0,
  0.5, 0.5, 0.5, 1.0
]);
const textureSpaceMvp = textureSpaceConversion.multiply(lightPovMvp);
const lightPovMvpRenderLocation = gl.getUniformLocation(program, 'lightPovMvp');


gl.useProgram(program);
gl.uniformMatrix4fv(lightPovMvpRenderLocation, false, textureSpaceMvp.toFloat32Array());

// Set Camera MVP Matrix
const cameraPosition = new DOMPoint(-0.8, 2, 0.8);
const view = createLookAt(cameraPosition, origin);
const projection = createPerspective(Math.PI / 3, 16 / 9, 0.1, 10);
const modelViewProjection = projection.multiply(view);

const projectionLoc = gl.getUniformLocation(program, 'modelViewProjection');
gl.uniformMatrix4fv(projectionLoc, false, modelViewProjection.toFloat32Array());


// Create cubes and bind their data
const verticesPerCube = 6 * 6;
const cubes = new Float32Array([
  ...createCubeWithNormals(20, 0.1, 20, 0, 0, 0),
  ...createCubeWithNormals(0.3, 0.5, 0.1, 0, 0, 0)
]);

const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, cubes, gl.STATIC_DRAW);

gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
gl.enableVertexAttribArray(0);
gl.enableVertexAttribArray(1);

// Depth Texture
const depthTextureSize = new DOMPoint(1024, 1024);
const depthTexture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, depthTexture);
gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT32F, depthTextureSize.x, depthTextureSize.y);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

const depthFramebuffer = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depthTexture, 0);

// Get access to the shadow map uniform so we can set it during draw
const shadowMapLocation = gl.getUniformLocation(program, 'shadowMap');

// gl.bindFramebuffer(gl.FRAMEBUFFER, null);


function draw() {
  gl.clearDepth(1.0);
  gl.clearColor(1.0, 1.0, 1.0, 1.0);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Render shadow map to depth texture
  gl.useProgram(depthProgram);
  gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);
  gl.viewport(0, 0, depthTextureSize.x, depthTextureSize.y);
  gl.drawArrays(gl.TRIANGLES, 0, verticesPerCube * 2);

  // Set depth texture and render scene to canvas
  gl.useProgram(program);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.bindTexture(gl.TEXTURE_2D, depthTexture);
  gl.uniform1i(shadowMapLocation, 0);
  gl.drawArrays(gl.TRIANGLES, 0, verticesPerCube * 2);

  requestAnimationFrame(draw)
}

draw();
