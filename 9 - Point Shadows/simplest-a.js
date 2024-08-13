import {
  createLookAt,
  createLookAt2,
  createMultiColorCube,
  createOrtho,
  createPerspective,
  createProgram
} from '../helper-methods.js';

const depthVertexShader = `#version 300 es

layout(location=0) in vec4 aPosition;

uniform mat4 modelViewProjection;

void main(){
  gl_Position = modelViewProjection * aPosition;
}
`;

const depthFragmentShader = `#version 300 es
precision mediump float;

vec4 lightWorldPos = vec4(0.0, 0.0, 0.0, 0.0);
out float fragDepth;

void main(){
  vec4 lightToVertex = gl_FragCoord - lightWorldPos;
 fragDepth = length(lightToVertex);
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

// Set Light MVP Matrix
// const inverseLightDirection = new DOMPoint(-0.5, 2, -2);
// const lightPovProjection = createOrtho(-1,1,-1,1,0,4);
// const lightPovView = createLookAt(inverseLightDirection, origin);
// const lightPovMvp = lightPovProjection.multiply(lightPovView);



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
  ...createMultiColorCube(5, 0.1, 5, 0, -1, 0),
  ...createMultiColorCube(0.3, 0.5, 0.1, 0, -1, 0)
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


// bind to the TEXTURE_CUBE_MAP bind point of texture unit 0
gl.bindTexture(gl.TEXTURE_CUBE_MAP, depthTexture);


gl.texStorage2D(gl.TEXTURE_CUBE_MAP, 1, gl.DEPTH_COMPONENT32F, depthTextureSize.x, depthTextureSize.y);

gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
//
const depthFramebuffer = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);
gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_CUBE_MAP_POSITIVE_X, depthTexture, 0);

// Get access to the shadow map uniform so we can set it during draw
const shadowMapLocation = gl.getUniformLocation(program, 'shadowMap');

const cubeSides = [
{ face: gl.TEXTURE_CUBE_MAP_POSITIVE_X, target: new DOMPoint(1.0, 0.0, 0.0),  up: new DOMPoint(0.0, -1.0, 0.0) },
{ face: gl.TEXTURE_CUBE_MAP_NEGATIVE_X, target: new DOMPoint(-1., 0.0, 0.0), up: new DOMPoint(0.0, -1.0, 0.0) },
{ face: gl.TEXTURE_CUBE_MAP_POSITIVE_Y, target: new DOMPoint(0.0, 1.0, 0.0),  up: new DOMPoint(0.0, 0.0, 1.0) },
{ face: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, target: new DOMPoint(0.0, -1.0, 0.0), up: new DOMPoint(0.0, 0.0, -1.0) },
{ face: gl.TEXTURE_CUBE_MAP_POSITIVE_Z, target: new DOMPoint(0.0, 0.0, 1.0),  up: new DOMPoint(0.0, -1.0, 0.0) },
{ face: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, target: new DOMPoint(0.0, 0.0, -1.0), up: new DOMPoint(0.0, -1.0, 0.0) }
];


function draw() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Render shadow map to depth texture
  gl.useProgram(depthProgram);
  gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);
  gl.viewport(0, 0, depthTextureSize.x, depthTextureSize.y);
  const lightPos = new DOMPoint(0, 0, 0);
  const lightProjection = createPerspective(Math.PI / 2, 1)
  const lightMvpLocation = gl.getUniformLocation(depthProgram, 'modelViewProjection');


  cubeSides.forEach(side => {
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, side.face, depthTexture, 0);
    const lightView = createLookAt(lightPos, side.target, side.up);
    const lightMvp = lightProjection.multiply(lightView);
    gl.uniformMatrix4fv(lightMvpLocation, false, lightMvp.toFloat32Array());
    gl.drawArrays(gl.TRIANGLES, 0, verticesPerCube * 2);
  });


  // Set depth texture and render scene to canvas
  gl.useProgram(program);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, depthTexture);
  gl.uniform1i(shadowMapLocation, 0);
  gl.drawArrays(gl.TRIANGLES, 0, verticesPerCube * 2);
}

draw();
