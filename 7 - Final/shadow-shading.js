import {
  createCubeWithNormals,
  createLookAt, createOrtho,
  createPerspective,
  createProgram
} from '../helper-methods.js';

const depthVertexShader = `#version 300 es

layout(location=0) in vec4 aPosition;

uniform mat4 lightPovMvp;

void main(){
  gl_Position = lightPovMvp * aPosition;
}
`;

const depthFragmentShader = `#version 300 es
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
out vec4 positionFromLightPov;

void main()
{
    vNormal = aNormal;
    gl_Position = modelViewProjection * aPosition;
    positionFromLightPov = lightPovMvp * aPosition;
}`;


const fragmentShaderSrc = `#version 300 es
precision mediump float;

uniform vec3 uLightDirection;

in vec3 vNormal;
in vec4 positionFromLightPov;

uniform mediump sampler2DShadow shadowMap;

out vec3 fragColor;

float ambientLight = 0.4;

vec2 adjacentPixels[4] = vec2[](
  vec2(-1, 0), 
  vec2(1, 0), 
  vec2(0, 1), 
  vec2(0, -1)
);

vec3 color = vec3(0.7, 0.7, 0.7);

float visibility = 1.0;
float shadowSpread = 1100.0;

void main()
{
  vec3 normalizedNormal = normalize(vNormal);
  float lightSurfaceCosine = dot(uLightDirection, normalizedNormal);
  float lightSurfaceAngle = acos(lightSurfaceCosine);
  float lightCos = max(lightSurfaceCosine, 0.0);
  
  for (int i = 0; i < 4; i++) {
    vec3 biased = vec3(positionFromLightPov.xy + adjacentPixels[i]/shadowSpread, positionFromLightPov.z);
    float hitByLight = texture(shadowMap, biased);
    visibility *= max(hitByLight, 0.83);
  }
  
  float brightness = max(lightCos, ambientLight);
  fragColor = color * max(brightness * visibility, ambientLight);
}`;


const gl = document.querySelector('canvas').getContext('webgl2');

const program = createProgram(gl, vertexShaderSrc, fragmentShaderSrc);
const depthProgram = createProgram(gl, depthVertexShader, depthFragmentShader);

gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);

const origin = new DOMPoint(0, 0, 0);

// Setup Light
gl.useProgram(program);
const inverseLightDirection = new DOMPoint(-0.0, 1, -0.5);
const lightDirectionLoc = gl.getUniformLocation(program,'uLightDirection');
gl.uniform3fv(lightDirectionLoc, new Float32Array([inverseLightDirection.x, inverseLightDirection.y, inverseLightDirection.z]));
const lightPovProjection = createOrtho(-1,1,-1,1,0,5);
const lightPovView = createLookAt(inverseLightDirection, origin);
const lightPovMvp = lightPovProjection.multiply(lightPovView);

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
const cameraPosition = new DOMPoint(-0.6, 0.7, -0.6);
const projection = createPerspective(Math.PI / 3, 16 / 9, 0.1, 10);
const projectionLoc = gl.getUniformLocation(program, 'modelViewProjection');
const view = createLookAt(cameraPosition, origin);
const modelViewProjection = projection.multiply(view);
gl.uniformMatrix4fv(projectionLoc, false, modelViewProjection.toFloat32Array());

// Create cubes and bind their data
const verticesPerCube = 6 * 6;
const numberOfCubes = 3;
const cubes = new Float32Array([
  ...createCubeWithNormals(1, 0.1, 1, 0, 0, 0),
  ...createCubeWithNormals(0.1, 0.4, 0.1, 0, 0.2, 0),
  ...createCubeWithNormals(0.4, 0.2, 0.1, 0.3, 0.2, -0.3)
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

let previousTime = 0;

const lightRotationAngles = new DOMPoint();
const lightSpinRate = 0.15;
const lightRiseSetRate = 0.05;

const cameraRotationAngles = new DOMPoint();
const cameraSpinRate = 0.1;

const debug = document.querySelector('#debug');

function draw(time) {
  const interval = (time - previousTime) / 1000;
  previousTime = time;

  lightRotationAngles.x += lightSpinRate * interval;
  lightRotationAngles.y += lightRiseSetRate * interval;
  lightRotationAngles.z += lightSpinRate * interval;

  inverseLightDirection.x = (Math.cos(lightRotationAngles.x) * 1);
  inverseLightDirection.y = Math.abs(Math.sin(lightRotationAngles.y) * 2);
  inverseLightDirection.z = (Math.sin(lightRotationAngles.z) * 1);
  debug.innerHTML = inverseLightDirection.x + ' ' + inverseLightDirection.y;

  gl.uniform3fv(lightDirectionLoc, new Float32Array([inverseLightDirection.x, inverseLightDirection.y, inverseLightDirection.z]));

  const lightPovView = createLookAt(inverseLightDirection, origin);
  const lightPovMvp = lightPovProjection.multiply(lightPovView);

  // Render shadow map to depth texture
  gl.useProgram(depthProgram);

  gl.uniformMatrix4fv(lightPovMvpDepthLocation, false, lightPovMvp.toFloat32Array());


  gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  gl.viewport(0, 0, depthTextureSize.x, depthTextureSize.y);
  gl.cullFace(gl.FRONT);
  gl.drawArrays(gl.TRIANGLES, 0, verticesPerCube * numberOfCubes);


  // MAIN RENDER
  gl.useProgram(program);

  cameraRotationAngles.x -= cameraSpinRate * interval;
  cameraRotationAngles.z -= cameraSpinRate * interval;
  cameraPosition.x = (Math.cos(cameraRotationAngles.x) * 1);
  cameraPosition.z = (Math.sin(cameraRotationAngles.z) * 1);
  const view = createLookAt(cameraPosition, origin);
  const modelViewProjection = projection.multiply(view);
  gl.uniformMatrix4fv(projectionLoc, false, modelViewProjection.toFloat32Array());


  const textureSpaceMvp = textureSpaceConversion.multiply(lightPovMvp);
  gl.uniformMatrix4fv(lightPovMvpRenderLocation, false, textureSpaceMvp.toFloat32Array());

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.bindTexture(gl.TEXTURE_2D, depthTexture);
  gl.uniform1i(shadowMapLocation, 0);  gl.cullFace(gl.FRONT);
  gl.cullFace(gl.BACK);
  gl.drawArrays(gl.TRIANGLES, 0, verticesPerCube * numberOfCubes);

  requestAnimationFrame(draw);
}

draw(0);
