import {createLookAt, createPerspective, createProgram} from "../helper-methods.js";

var vertexShaderSource = `#version 300 es
in vec4 a_position;

uniform mat4 u_matrix;

out vec3 v_normal;

void main() {
  // Multiply the position by the matrix.
  gl_Position = u_matrix * a_position;

  // Pass a normal. Since the positions
  // centered around the origin we can just 
  // pass the position
  v_normal = normalize(a_position.xyz);
}
`;
const fragmentShaderSource = `#version 300 es
precision highp float;

// Passed in from the vertex shader.
in vec3 v_normal;

// The texture.
uniform samplerCube u_texture;

// we need to declare an output for the fragment shader
out vec4 outColor;

void main() {
   outColor = texture(u_texture, normalize(v_normal));
}
`;

  const gl = document.querySelector('canvas').getContext('webgl2');

gl.enable(gl.DEPTH_TEST);
gl.enable(gl.CULL_FACE);

  const program = createProgram(gl, vertexShaderSource, fragmentShaderSource);

  const positionLocation = gl.getAttribLocation(program, "a_position");
  const matrixLocation = gl.getUniformLocation(program, "u_matrix");
  const textureLocation = gl.getUniformLocation(program, "u_texture");

  // Create a vertex array object (attribute state)
  var vao = gl.createVertexArray();

  // and make it the one we're currently working with
  gl.bindVertexArray(vao);

  // Create a buffer for positions
  var positionBuffer = gl.createBuffer();
  // Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  // Put the positions in the buffer
  setGeometry(gl);

  // Turn on the position attribute
  gl.enableVertexAttribArray(positionLocation);

  // Tell the position attribute how to get data out of positionBuffer (ARRAY_BUFFER)
  var size = 3;          // 3 components per iteration
  var type = gl.FLOAT;   // the data is 32bit floats
  var normalize = false; // don't normalize the data
  var stride = 0;        // 0 = move forward size * sizeof(type) each iteration to get the next position
  var offset = 0;        // start at the beginning of the buffer
  gl.vertexAttribPointer(
    positionLocation, size, type, normalize, stride, offset);

  // Create a texture.
  var texture = gl.createTexture();

  // use texture unit 0
  gl.activeTexture(gl.TEXTURE0 + 0);

  // bind to the TEXTURE_CUBE_MAP bind point of texture unit 0
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

  // Get A 2D context
  /** @type {Canvas2DRenderingContext} */
  const ctx = new OffscreenCanvas(128, 128).getContext('2d'); // document.querySelector("#twod").getContext("2d");
const ext = gl.getExtension('EXT_color_buffer_float');
const ext2 = gl.getExtension('OES_texture_float_linear');
const faceInfos = [
  { target: gl.TEXTURE_CUBE_MAP_POSITIVE_X },
  { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_X },
  { target: gl.TEXTURE_CUBE_MAP_POSITIVE_Y },
  { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y },
  { target: gl.TEXTURE_CUBE_MAP_POSITIVE_Z },
  { target: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z },
];

faceInfos.forEach((faceInfo) => {
  const test = new Float32Array(128 * 128 * 4);
  test.fill(1.0);

  // Upload the data to the cubemap face.
  const level = 0;
  const internalFormat = gl.RGBA32F;
  const width = 128;
  const height = 128;
  const border = 0;
  const format = gl.RGBA;
  const type = gl.FLOAT;
  gl.texImage2D(faceInfo.target, level, internalFormat, width, height, border, format, type, test);
});
  //gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);

  requestAnimationFrame(drawScene);

  // Draw the scene.
  function drawScene(time) {

    // Tell WebGL how to convert from clip space to pixels
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);

    // Clear the canvas AND the depth buffer.
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Tell it to use our program (pair of shaders)
    gl.useProgram(program);

    // Bind the attribute/buffer set we want.
    gl.bindVertexArray(vao);

    // Compute the projection matrix
    const origin = new DOMPoint(0, 0, 0);
    const cameraPosition = new DOMPoint(3, 3, 3);
    const view = createLookAt(cameraPosition, origin);
    const projection = createPerspective(Math.PI / 3, 16 / 9, 0.1, 10);
    const modelViewProjection = projection.multiply(view);

    // Set the matrix.
    gl.uniformMatrix4fv(matrixLocation, false, modelViewProjection.toFloat32Array());

    // Tell the shader to use texture unit 0 for u_texture
    gl.uniform1i(textureLocation, 0);

    // Draw the geometry.
    gl.drawArrays(gl.TRIANGLES, 0, 6 * 6);

    requestAnimationFrame(drawScene);
  }


function generateFace(ctx, faceColor, textColor, text) {
  const {width, height} = ctx.canvas;
  ctx.fillStyle = faceColor;
  ctx.fillRect(0, 0, width, height);
  ctx.font = `${width * 0.7}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = textColor;
  ctx.fillText(text, width / 2, height / 2);
}

// Fill the buffer with the values that define a cube.
function setGeometry(gl) {
  var positions = new Float32Array(
    [
      -0.5, -0.5,  -0.5,
      -0.5,  0.5,  -0.5,
      0.5, -0.5,  -0.5,
      -0.5,  0.5,  -0.5,
      0.5,  0.5,  -0.5,
      0.5, -0.5,  -0.5,

      -0.5, -0.5,   0.5,
      0.5, -0.5,   0.5,
      -0.5,  0.5,   0.5,
      -0.5,  0.5,   0.5,
      0.5, -0.5,   0.5,
      0.5,  0.5,   0.5,

      -0.5,   0.5, -0.5,
      -0.5,   0.5,  0.5,
      0.5,   0.5, -0.5,
      -0.5,   0.5,  0.5,
      0.5,   0.5,  0.5,
      0.5,   0.5, -0.5,

      -0.5,  -0.5, -0.5,
      0.5,  -0.5, -0.5,
      -0.5,  -0.5,  0.5,
      -0.5,  -0.5,  0.5,
      0.5,  -0.5, -0.5,
      0.5,  -0.5,  0.5,

      -0.5,  -0.5, -0.5,
      -0.5,  -0.5,  0.5,
      -0.5,   0.5, -0.5,
      -0.5,  -0.5,  0.5,
      -0.5,   0.5,  0.5,
      -0.5,   0.5, -0.5,

      0.5,  -0.5, -0.5,
      0.5,   0.5, -0.5,
      0.5,  -0.5,  0.5,
      0.5,  -0.5,  0.5,
      0.5,   0.5, -0.5,
      0.5,   0.5,  0.5,

    ]);
  gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
}

