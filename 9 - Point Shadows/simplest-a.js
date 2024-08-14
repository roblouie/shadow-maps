import {
  createLookAt,
  createLookAt2,
  createMultiColorCube,
  createOrtho,
  createPerspective,
  createProgram
} from '../helper-methods.js';
import {createShadowMapCubemap, renderSceneToCubemap} from "./cube-buffer.js";

const depthVertexShader = `#version 300 es

layout(location=0) in vec4 aPosition;

uniform mat4 modelViewProjection;

void main(){
  gl_Position = modelViewProjection * aPosition;
}
`;

const depthFragmentShader = `#version 300 es
precision mediump float;

in vec3 vColor;

out float fragDepth;

void main(){
 fragDepth = gl_FragCoord.z;
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

uniform mediump samplerCubeShadow shadowMap;

out vec3 fragColor;

float ambientLight = 0.5;

void main()
{
  vec4 lightPovPositionInTexture = worldPos - lightWorldPos;
  float hitByLight = texture(shadowMap, lightPovPositionInTexture);
  float litPercent = max(hitByLight, ambientLight);
  fragColor = vColor * litPercent;
}`;


const gl = document.querySelector('canvas').getContext('webgl2');

gl.enable(gl.DEPTH_TEST);

const origin = new DOMPoint(0, 0, 0);

const program = createProgram(gl, vertexShaderSrc, fragmentShaderSrc);
const depthProgram = createProgram(gl, depthVertexShader, depthFragmentShader);


// Set Camera MVP Matrix
const cameraPosition = new DOMPoint(4, 2, 0.6);
const view = createLookAt(cameraPosition, origin);
const projection = createPerspective(Math.PI / 3, 16 / 9, 0.1, 10);
const modelViewProjection = projection.multiply(view);


gl.useProgram(program);
const projectionLoc = gl.getUniformLocation(program, 'modelViewProjection');
gl.uniformMatrix4fv(projectionLoc, false, modelViewProjection.toFloat32Array());


// Create cubes and bind their data
const verticesPerCube = 6 * 6;
const cubes = new Float32Array([
  ...createMultiColorCube(1, 0.1, 1, 0, -0.5, 0),
  ...createMultiColorCube(0.3, 0.5, 0.1, -0.5, -0.3, 0),
  ...createMultiColorCube(0.1, 0.1, 0.1, 0, -0.2, -0.5),
]);

const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, cubes, gl.STATIC_DRAW);

gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
gl.enableVertexAttribArray(0);
gl.enableVertexAttribArray(1);

//
const depthFramebuffer = gl.createFramebuffer();

// Get access to the shadow map uniform so we can set it during draw
const shadowMapLocation = gl.getUniformLocation(program, 'shadowMap');

const cubeMap = createShadowMapCubemap(gl, 1024);

function draw() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Render shadow map to depth texture
  gl.useProgram(depthProgram);

  const lightPos = new DOMPoint(0, 0, 0);
  const lightProjection = createPerspective(Math.PI / 2, 1, 0.1, 1000)
  const lightMvpLocation = gl.getUniformLocation(depthProgram, 'modelViewProjection');

  renderSceneToCubemap(gl, depthFramebuffer, cubeMap, 1024, side => {
    const lightView = createLookAt(lightPos, side.target, side.up);
    const lightMvp = lightProjection.multiply(lightView);
    gl.uniformMatrix4fv(lightMvpLocation, false, lightMvp.toFloat32Array());
    gl.drawArrays(gl.TRIANGLES, 0, verticesPerCube * 3);
  })


  // Set depth texture and render scene to canvas
  gl.useProgram(program);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);
  gl.uniform1i(shadowMapLocation, 0);
  gl.drawArrays(gl.TRIANGLES, 0, verticesPerCube * 3);
}

draw();
