import {
  createLookAt,
  createLookAt2,
  createMultiColorCube,
  createOrtho,
  createPerspective,
  createProgram
} from '../helper-methods.js';
import {createShadowMapCubemap, getSides, renderSceneToCubemap, ShadowCubeMapFbo} from "./cube-buffer.js";

const depthVertexShader = `#version 300 es

layout(location=0) in vec4 aPosition;

uniform mat4 modelViewProjection;

out vec3 worldPosition;

void main(){
  gl_Position = modelViewProjection * aPosition;
  worldPosition = aPosition.xyz;
}
`;

const depthFragmentShader = `#version 300 es
precision mediump float;

vec3 gLightWorldPos = vec3(2.0, 1.0, 0.0);

in vec3 worldPosition;

out vec4 lightToPixelDistance;

vec4 pack(const in float depth) {
  const vec4 bitShift = vec4(255.0 * 255.0 * 255.0, 255.0 * 255.0, 255.0, 1.0);
  const vec4 bitMask = vec4(0.0, 1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0);

  vec4 res = fract(depth * bitShift);
  res -= res.xxyz * bitMask;

  return res;
}

void main(){
  vec3 lightToVertex = worldPosition - gLightWorldPos;
  lightToPixelDistance = pack(length(lightToVertex));
}
`;

const vertexShaderSrc = `#version 300 es

layout(location=0) in vec4 aPosition;
layout(location=1) in vec3 aColor;

uniform mat4 modelViewProjection;

out vec3 vColor;
out vec4 worldPos;

void main()
{
    vColor = aColor;
    gl_Position = modelViewProjection * aPosition;
    worldPos = aPosition;
}`;

const fragmentShaderSrc = `#version 300 es
precision mediump float;

in vec3 vColor;
in vec4 worldPos;
vec4 lightWorldPos = vec4(0.0, 0.0, 0.0, 0.0);

uniform mediump samplerCube shadowMap;

out vec3 fragColor;

float ambientLight = 0.5;

float unpack(in vec4 color) {
   const vec4 bitShift = vec4(1.0 / (255.0 * 255.0 * 255.0), 1.0 / (255.0 * 255.0), 1.0 / 255.0, 1.0);
   return dot(color, bitShift);
}

void main()
{
  vec3 lightPovPositionInTexture = worldPos.xyz - lightWorldPos.xyz;
  float vertexDepth = clamp(length(lightPovPositionInTexture), 0.0, 1.0);
  float shadowMapDepth = unpack(texture(shadowMap, lightPovPositionInTexture)) + 0.0001;
  float hitByLight = (vertexDepth > shadowMapDepth) ? 0.0 : 1.0;
  float litPercent = max(hitByLight, ambientLight);
  fragColor = vColor * litPercent;
}`;


const gl = document.querySelector('canvas').getContext('webgl2');

gl.enable(gl.DEPTH_TEST);

const origin = new DOMPoint(0, 0, 0);

const program = createProgram(gl, vertexShaderSrc, fragmentShaderSrc);
const depthProgram = createProgram(gl, depthVertexShader, depthFragmentShader);


// Set Camera MVP Matrix
const cameraPosition = new DOMPoint(1, 2, 0.6);
const view = createLookAt(cameraPosition, origin);
const projection = createPerspective(Math.PI / 3, 16 / 9, 0.1, 10);
const modelViewProjection = projection.multiply(view);


gl.useProgram(program);
const projectionLoc = gl.getUniformLocation(program, 'modelViewProjection');
gl.uniformMatrix4fv(projectionLoc, false, modelViewProjection.toFloat32Array());


// Create cubes and bind their data
const verticesPerCube = 6 * 6;
const cubes = new Float32Array([
  ...createMultiColorCube(1, 0.1, 1, 0, -0.8, 0),
  ...createMultiColorCube(0.3, 0.5, 0.1, -0.7, -0.3, 0.0),
  ...createMultiColorCube(0.1, 0.1, 0.1, 0.1, -0.1, -0.2),
]);

const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, cubes, gl.STATIC_DRAW);

gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
gl.enableVertexAttribArray(0);
gl.enableVertexAttribArray(1);

//

// Get access to the shadow map uniform so we can set it during draw
const shadowMapLocation = gl.getUniformLocation(program, 'shadowMap');

const cubeMap = new ShadowCubeMapFbo(1024, gl);
gl.bindFramebuffer(gl.FRAMEBUFFER, null);

function draw() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Render shadow map to depth texture
  gl.useProgram(depthProgram);

  const lightPos = new DOMPoint(0, 0, 0);
  const lightProjection = createPerspective(Math.PI / 2, 1, 0.1, 10)
  const lightMvpLocation = gl.getUniformLocation(depthProgram, 'modelViewProjection');

  const sides = getSides(gl);

  for (let i = 0; i < 6; i++) {
    cubeMap.bindForWriting(i, gl);

    const side = sides[i];
    gl.clear(gl.DEPTH_BUFFER_BIT);

    // Render the scene from the perspective of the current cubemap face
    const lightView = createLookAt(lightPos, side.target, side.up);
    const lightMvp = lightProjection.multiply(lightView);
    gl.uniformMatrix4fv(lightMvpLocation, false, lightMvp.toFloat32Array());
    gl.drawArrays(gl.TRIANGLES, 0, verticesPerCube * 3);
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  // Set depth texture and render scene to canvas
  gl.useProgram(program);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap.cubeMapTexture);
  gl.uniform1i(shadowMapLocation, 0);
  gl.drawArrays(gl.TRIANGLES, 0, verticesPerCube * 3);

  requestAnimationFrame(draw);
}

draw();
