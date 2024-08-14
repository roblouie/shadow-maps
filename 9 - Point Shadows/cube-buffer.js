export function createShadowMapCubemap(gl, size) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_CUBE_MAP, texture);

  for (let i = 0; i < 6; i++) {
    gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, gl.DEPTH_COMPONENT24,
      size, size, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
  }

  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);

  // Enable depth comparison for shadow mapping
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_COMPARE_MODE, gl.COMPARE_REF_TO_TEXTURE);
  gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_COMPARE_FUNC, gl.LEQUAL);

  return texture;
}

export function getSides(gl) {
  return [
    { face: gl.TEXTURE_CUBE_MAP_POSITIVE_X, target: new DOMPoint(1.0, 0.0, 0.0),  up: new DOMPoint(0.0, 1.0, 0.0) },
    { face: gl.TEXTURE_CUBE_MAP_NEGATIVE_X, target: new DOMPoint(-1., 0.0, 0.0), up: new DOMPoint(0.0, 1.0, 0.0) },
    { face: gl.TEXTURE_CUBE_MAP_POSITIVE_Y, target: new DOMPoint(0.0, 1.0, 0.0),  up: new DOMPoint(0.0, 0.0, 1.0) },
    { face: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, target: new DOMPoint(0.0, -1.0, 0.0), up: new DOMPoint(0.0, 0.0, -1.0) },
    { face: gl.TEXTURE_CUBE_MAP_POSITIVE_Z, target: new DOMPoint(0.0, 0.0, 1.0),  up: new DOMPoint(0.0, 1.0, 0.0) },
    { face: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, target: new DOMPoint(0.0, 0.0, -1.0), up: new DOMPoint(0.0, 1.0, 0.0) }
  ];
}

export function renderSceneToCubemap(gl, framebuffer, cubemapTexture, size, renderSceneCallback) {
  const sides = getSides(gl);

  for (let i = 0; i < 6; i++) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, sides[i].face, cubemapTexture, 0);

    gl.viewport(0, 0, size, size);
    gl.clear(gl.DEPTH_BUFFER_BIT);

    // Render the scene from the perspective of the current cubemap face
    renderSceneCallback(sides[i]);

    if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) != gl.FRAMEBUFFER_COMPLETE) {
      console.error("Framebuffer is not complete");
    }
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
