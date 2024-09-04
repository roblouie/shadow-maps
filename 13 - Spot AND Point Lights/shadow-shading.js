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

uniform vec3 uSpotlightPosition;
uniform vec3 uSpotlightDirection;

uniform vec3 uPointLightPosition;

in vec3 vPosition;
in vec3 vNormal;

out vec3 fragColor;

float ambientLight = 0.2;
float lightInnerCutoff = 0.7;
float lightOuterCutoff = 0.1;

vec3 color = vec3(1.0, 1.0, 1.0);
vec3 spotlightColor = vec3(1.0, 0.0, 0.0);
vec3 pointLightColor = vec3(0.0, 1.0, 0.0);

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
  
  vec3 litColor = spotlightColor * spotlightBrightness + pointLightColor;
  
  fragColor = color * litColor;
}`;


const gl = document.querySelector('canvas').getContext('webgl2');

gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);

const origin = new DOMPoint(0, 0, 0);

const program = createProgram(gl, vertexShaderSrc, fragmentShaderSrc);

// Setup Light
gl.useProgram(program);

// Point Light Position
const pointLightPosition = new DOMPoint(-0.4, 1, -0.9);
const pointLightPositionLoc = gl.getUniformLocation(program,'uPointLightPosition');
gl.uniform3fv(pointLightPositionLoc, new Float32Array([pointLightPosition.x, pointLightPosition.y, pointLightPosition.z]));

// Spotlight Position
const lightPosition = new DOMPoint(0.7, 1, 0.7);
const lightPositionLoc = gl.getUniformLocation(program,'uSpotlightPosition');
gl.uniform3fv(lightPositionLoc, new Float32Array([lightPosition.x, lightPosition.y, lightPosition.z]));

// Spotlight Direction
const lightDirection = new DOMPoint(0, -1.0, 0.0);
const lightDirectionLoc = gl.getUniformLocation(program, 'uSpotlightDirection');
gl.uniform3fv(lightDirectionLoc, new Float32Array([lightDirection.x, lightDirection.y, lightDirection.z]));


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
