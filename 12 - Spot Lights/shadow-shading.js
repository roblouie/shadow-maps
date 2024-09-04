import {
  createCubeWithNormals,
  createLookAt, createOrtho,
  createPerspective,
  createProgram, normalize
} from '../helper-methods.js';

const vertexShaderSrc = `#version 300 es

layout(location=0) in vec4 aPosition;
layout(location=1) in vec3 aNormal;

uniform mat4 modelViewProjection;

out vec3 vNormal;
out vec3 vPosition;

void main()
{
    vNormal = aNormal;
    gl_Position = modelViewProjection * aPosition;
    vPosition = aPosition.xyz;
}`;


const fragmentShaderSrc = `#version 300 es
precision mediump float;

uniform vec3 uLightPosition;
uniform vec3 uLightDirection;

in vec3 vPosition;
in vec3 vNormal;

out vec3 fragColor;

float ambientLight = 0.2;
float lightInnerCutoff = 0.4;
float lightOuterCutoff = 0.1;

vec3 color = vec3(1.0, 1.0, 1.0);

void main()
{
  vec3 offset = uLightPosition - vPosition;
  vec3 surfaceToLight = normalize(offset);
  
  float diffuse = max(0.0, dot(surfaceToLight, normalize(vNormal)));
  float angleToSurface = dot(uLightDirection, -surfaceToLight);
  float spot = smoothstep(lightOuterCutoff, lightInnerCutoff, angleToSurface);

  float brightness = diffuse * spot;
  
  fragColor = color * clamp(brightness, 0.1, 0.8);
}`;


const gl = document.querySelector('canvas').getContext('webgl2');

gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);

const origin = new DOMPoint(0, 0, 0);

const program = createProgram(gl, vertexShaderSrc, fragmentShaderSrc);

// Setup Light
gl.useProgram(program);

// Light Position
const lightPosition = new DOMPoint(0.7, 1, 0.7);
const lightPositionLoc = gl.getUniformLocation(program,'uLightPosition');
gl.uniform3fv(lightPositionLoc, new Float32Array([lightPosition.x, lightPosition.y, lightPosition.z]));

// Light Direction
const lightDirection = new DOMPoint(0, -1.0, 0.0);
const lightDirectionLoc = gl.getUniformLocation(program, 'uLightDirection');
gl.uniform3fv(lightDirectionLoc, new Float32Array([lightDirection.x, lightDirection.y, lightDirection.z]));


// Set Camera MVP Matrix
const cameraPosition = new DOMPoint(0.8, 5, 0.8);
const view = createLookAt(cameraPosition, origin);
const projection = createPerspective(Math.PI / 3, 16 / 9, 0.1, 10);
const modelViewProjection = projection.multiply(view);

const projectionLoc = gl.getUniformLocation(program, 'modelViewProjection');
gl.uniformMatrix4fv(projectionLoc, false, modelViewProjection.toFloat32Array());


// Create cubes and bind their data
const verticesPerCube = 6 * 6;
const cubes = new Float32Array([
  ...createCubeWithNormals(10, 0.1, 10, 0, 0, 0),
  ...createCubeWithNormals(0.3, 0.5, 0.1, 0, 0, 0)
]);

const vertexBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
gl.bufferData(gl.ARRAY_BUFFER, cubes, gl.STATIC_DRAW);

gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 24, 0);
gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 24, 12);
gl.enableVertexAttribArray(0);
gl.enableVertexAttribArray(1);

function draw() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Set depth texture and render scene to canvas
  gl.useProgram(program);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.drawArrays(gl.TRIANGLES, 0, verticesPerCube * 2);
}

draw();
