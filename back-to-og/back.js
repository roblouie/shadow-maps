import './style.css';

import { createMultiColorCube, createProgram } from '../helper-methods.js';
import { mat4 } from 'gl-matrix';

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

vec3 lightWorldPos = vec3(0.0, 0.0, 0.0);

out vec3 vColor;
out vec3 vLightDirection;

void main()
{
    vColor = aColor;
    gl_Position = modelViewProjection * aPosition;
    vLightDirection = lightWorldPos - aPosition.xyz;
}`;

const fragmentShaderSrc = `#version 300 es
precision mediump float;

in vec3 vColor;
in vec3 vLightDirection;

uniform mediump samplerCubeShadow shadowMap;

out vec3 fragColor;

float ambientLight = 0.5;

void main()
{
  vec3 L = normalize(vLightDirection);
  float hitByLight = texture(shadowMap, vec4(L, length(vLightDirection)));
  float litPercent = max(hitByLight, ambientLight);
  fragColor = vColor * litPercent;
}`;

const gl = document.querySelector('canvas').getContext('webgl2');

gl.enable(gl.DEPTH_TEST);
gl.cullFace(gl.BACK);

const program = createProgram(gl, vertexShaderSrc, fragmentShaderSrc);
const depthProgram = createProgram(gl, depthVertexShader, depthFragmentShader);

// Set Camera MVP Matrix
const view = mat4.lookAt(mat4.create(), [4, 1, 1], [0, 0, 0], [0, 1, 0]);
const projection = mat4.perspective(
  mat4.create(),
  Math.PI / 3,
  16 / 9,
  0.1,
  10
);

const modelViewProjection = mat4.multiply(mat4.create(), projection, view);

gl.useProgram(program);
const projectionLoc = gl.getUniformLocation(program, 'modelViewProjection');
gl.uniformMatrix4fv(projectionLoc, false, modelViewProjection);

// Create cubes and bind their data
const cubes = new Float32Array([
  ...createMultiColorCube(3, 0.1, 3, 0, -0.5, 0),
  ...createMultiColorCube(0.3, 0.5, 0.1, 0.5, -0.1, -0.9),
]);
const verticesPerCube = 6 * 6;

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

// const cubeMap = createShadowMapCubemap(gl, 1024);
const textureSize = 1024;
const cubeMap = gl.createTexture();
gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);

for (let i = 0; i < 6; i++) {
  gl.texImage2D(
    gl.TEXTURE_CUBE_MAP_POSITIVE_X + i,
    0,
    gl.DEPTH_COMPONENT24,
    textureSize,
    textureSize,
    0,
    gl.DEPTH_COMPONENT,
    gl.UNSIGNED_INT,
    null
  );
}

gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);

// Enable depth comparison for shadow mapping
gl.texParameteri(
  gl.TEXTURE_CUBE_MAP,
  gl.TEXTURE_COMPARE_MODE,
  gl.COMPARE_REF_TO_TEXTURE
);
gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);

const sides = [
  {
    face: gl.TEXTURE_CUBE_MAP_POSITIVE_X,
    matrix: mat4.lookAt(mat4.create(), [0, 0, 0], [1, 0, 0], [0, -1, 0]),
  },
  {
    face: gl.TEXTURE_CUBE_MAP_NEGATIVE_X,
    matrix: mat4.lookAt(mat4.create(), [0, 0, 0], [-1, 0, 0], [0, -1, 0]),
  },
  {
    face: gl.TEXTURE_CUBE_MAP_POSITIVE_Y,
    matrix: mat4.lookAt(mat4.create(), [0, 0, 0], [0, 1, 0], [0, 0, 1]),
  },
  {
    face: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y,
    matrix: mat4.lookAt(mat4.create(), [0, 0, 0], [0, -1, 0], [0, 0, -1]),
  },
  {
    face: gl.TEXTURE_CUBE_MAP_POSITIVE_Z,
    matrix: mat4.lookAt(mat4.create(), [0, 0, 0], [0, 0, 1], [0, -1, 0]),
  },
  {
    face: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z,
    matrix: mat4.lookAt(mat4.create(), [0, 0, 0], [0, 0, -1], [0, -1, 0]),
  },
];

function draw() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Render shadow map to depth texture
  gl.useProgram(depthProgram);

  const lightPerspective = mat4.perspective(
    mat4.create(),
    Math.PI / 2,
    1,
    0.1,
    10
  );
  const lightMvpLocation = gl.getUniformLocation(
    depthProgram,
    'modelViewProjection'
  );

  sides.forEach((side) => {
    gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.DEPTH_ATTACHMENT,
      side.face,
      cubeMap,
      0
    );

    gl.viewport(0, 0, textureSize, textureSize);
    gl.clear(gl.DEPTH_BUFFER_BIT);

    // Render the scene from the perspective of the current cubemap face
    const lightMvp = mat4.multiply(
      mat4.create(),
      lightPerspective,
      side.matrix
    );
    gl.uniformMatrix4fv(lightMvpLocation, false, lightMvp);
    gl.drawArrays(gl.TRIANGLES, 0, verticesPerCube * 2);
  });

  // Set depth texture and render scene to canvas
  gl.useProgram(program);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, cubeMap);
  gl.uniform1i(shadowMapLocation, 0);
  gl.drawArrays(gl.TRIANGLES, 0, verticesPerCube * 2);
}

draw();
