import {createLookAt, createMultiColorCube, createOrtho, createPerspective, createProgram} from '../helper-methods.js';

const vertexShaderSrc = `#version 300 es

layout(location=0) in vec4 aPosition;
layout(location=1) in vec3 aColor;

uniform mat4 modelViewProjection;

out vec3 vColor;

void main()
{
    vColor = aColor;
    gl_Position = modelViewProjection * aPosition;
}`;


const fragmentShaderSrc = `#version 300 es
precision mediump float;

in vec3 vColor;

out vec3 fragColor;

void main()
{
  fragColor = vColor;
}`;


const gl = document.querySelector('canvas').getContext('webgl2');

const program = createProgram(gl, vertexShaderSrc, fragmentShaderSrc);
gl.useProgram(program);

gl.enable(gl.DEPTH_TEST);

const origin = new DOMPoint(0, 0, 0);

// Set Camera MVP Matrix
const cameraPosition = new DOMPoint(0.6, 0.6, 0.6);
const view = createLookAt(cameraPosition, origin);
const projection = createPerspective(Math.PI / 3, 16 / 9, 0.1, 10);
const modelViewProjection = projection.multiply(view);

const projectionLoc = gl.getUniformLocation(program, 'modelViewProjection');
gl.uniformMatrix4fv(projectionLoc, false, modelViewProjection.toFloat32Array());


// Create cubes and bind their data
const verticesPerCube = 6 * 6;
const cubes = new Float32Array([
  ...createMultiColorCube(1, 0.1, 1, 0, 0, 0),
  ...createMultiColorCube(0.3, 0.5, 0.1, 0, 0, 0)
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

  gl.drawArrays(gl.TRIANGLES, 0, verticesPerCube * 2);
}

draw();
