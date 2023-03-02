
// The vertex shader for creating the depth texture takes in an array of vertex positions just like the
// regular render shader. Like a regular render shader, it also takes in a mvp matrix. The difference is that here
// the mvp is an orthographic projection pointing the direction of the directional light.
import {createLookAt, createMultiColorCube, createOrtho, createPerspective, createProgram} from '../helper-methods.js';

const depthVertexShader = `#version 300 es

layout(location=0) in vec4 aPosition;

uniform mat4 lightPovMvp;

void main(){
  gl_Position = lightPovMvp * aPosition;
}
`;

// The fragment shader for creating the depth texture outputs the z position of each pixel. This creates the depth texture.
const depthFragmentShader = `#version 300 es
precision mediump float;

out float fragmentdepth;

void main(){
 fragmentdepth = gl_FragCoord.z;
}
`;

// The main rendering vertex shader takes in positions and colors for the vertices and an mvp matrix, and output the
// color and transformed positions to the fragment shader. All that is identical to a shader that only renders different
// colored shapes. The only additions here are the depthMvp and the shadowPosition output. The depthMvp is simply the
// same mvp matrix from the depth vertex shader. We need this to get the vertex position from the point of view of the
// light. Just like the positions from the camera point of view are output to gl_Position, the positions from the light
// point of view are output to shadowPosition
const vertexShaderSrc = `#version 300 es

layout(location=0) in vec4 aPosition;
layout(location=1) in vec3 aColor;

uniform mat4 modelViewProjection;
uniform mat4 lightPovMvp;

out vec3 vColor;
out vec4 positionFromLightPov;

void main()
{
    vColor = aColor;
    gl_Position = modelViewProjection * aPosition;
    positionFromLightPov = lightPovMvp * aPosition;
}`;

// If you looked out from a source of light, all of the objects you can see would appear in light. Anything behind those
// objects, however, would be in shadow. With the current pixels position from the point of view of the light and the
// depth texture we can now determine this. Remember though that pixels in clip space go from -1 to 1, where pixels
// in texture space go from 0 to 1. So in order to find the matching pixel in our depth texture, we multiply by 0.5 then
// add 0.5. This converts from (-1, 1) to (0, 1). Now we check that, from the point of view of the light, is the current
// pixel closer to the light than the matching pixel in the depth texture. If so, it's in the light. If the current
// pixel is farther away than the matching pixel in the depth texture, that means something was rendered between it
// and the light, so it is in a shadow.
// To apply the shadow, we check that and multiply the output color by either 1.0 (fully lit) or (0.5) in the shadow.
const fragmentShaderSrc = `#version 300 es
precision mediump float;

in vec3 vColor;
in vec4 positionFromLightPov;

uniform mediump sampler2DShadow shadowMap;

out vec3 fragColor;

float ambientLight = 0.5;

void main()
{
  vec3 positionFromLightPovInTexture = positionFromLightPov.xyz * 0.5 + 0.5;
  float hitByLight = texture(shadowMap, positionFromLightPovInTexture);
  float litPercent = max(hitByLight, ambientLight);
  fragColor = vColor * litPercent;
}`;


const gl = document.querySelector('canvas').getContext('webgl2');

const program = createProgram(gl, vertexShaderSrc, fragmentShaderSrc);
const depthProgram = createProgram(gl, depthVertexShader, depthFragmentShader);

gl.enable(gl.DEPTH_TEST);

const origin = new DOMPoint(0, 0, 0);

// Set Light MVP Matrix
const inverseLightDirection = new DOMPoint(-0.5, 2, -2);
const lightPovProjection = createOrtho(-1,1,-1,1,0,4);
const lightPovView = createLookAt(inverseLightDirection, origin);
const lightPovMvp = lightPovProjection.multiply(lightPovView);

const lightPovMvpDepthLocation = gl.getUniformLocation(depthProgram, 'lightPovMvp');
gl.useProgram(depthProgram);
gl.uniformMatrix4fv(lightPovMvpDepthLocation, false, lightPovMvp.toFloat32Array());

const lightPovMvpRenderLocation = gl.getUniformLocation(program, 'lightPovMvp');
gl.useProgram(program);
gl.uniformMatrix4fv(lightPovMvpRenderLocation, false, lightPovMvp.toFloat32Array());


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

function draw() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Render shadow map to depth texture
  gl.useProgram(depthProgram);
  gl.bindFramebuffer(gl.FRAMEBUFFER, depthFramebuffer);
  gl.viewport(0, 0, depthTextureSize.x, depthTextureSize.y);
  gl.drawArrays(gl.TRIANGLES, 0, verticesPerCube * 2);

  gl.useProgram(program);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.bindTexture(gl.TEXTURE_2D, depthTexture);
  gl.uniform1i(shadowMapLocation, 0);

  gl.drawArrays(gl.TRIANGLES, 0, verticesPerCube * 2);
}

draw();
