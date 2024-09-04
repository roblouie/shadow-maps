
export class ShadowCubeMapFbo {
  constructor(size, gl) {
    this.size = size;

    // Create the depth buffer
    this.depthTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.depthTexture);
    gl.texStorage2D(gl.TEXTURE_2D, 1, gl.DEPTH_COMPONENT32F, size, size);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // gl.bindTexture(gl.TEXTURE_2D, 0); ?? DOESN"T WORK

    // Create the cube map
    this.cubeMapTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.cubeMapTexture);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);

    for (let i = 0; i < 6; i++) {
      gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X + i, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    }

    this.depthFramebuffer = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.depthFramebuffer);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.depthTexture, 0);
  }

  bindForWriting(faceIndex, gl) {
    const sides = getSides(gl);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.depthFramebuffer);
    gl.viewport(0, 0, this.size, this.size);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, sides[faceIndex].face, this.cubeMapTexture, 0);
  }
}

export function createShadowMapCubemap(gl, size) {


}

export function getSides(gl) {
  return [
    { face: gl.TEXTURE_CUBE_MAP_POSITIVE_X, target: new DOMPoint(1.0, 0.0, 0.0),  up: new DOMPoint(0.0, -1.0, 0.0) },
    { face: gl.TEXTURE_CUBE_MAP_NEGATIVE_X, target: new DOMPoint(-1., 0.0, 0.0), up: new DOMPoint(0.0, -1.0, 0.0) },
    { face: gl.TEXTURE_CUBE_MAP_POSITIVE_Y, target: new DOMPoint(0.0, 1.0, 0.0),  up: new DOMPoint(0.0, 0.0, 1.0) },
    { face: gl.TEXTURE_CUBE_MAP_NEGATIVE_Y, target: new DOMPoint(0.0, -1.0, 0.0), up: new DOMPoint(0.0, 0.0, -1.0) },
    { face: gl.TEXTURE_CUBE_MAP_POSITIVE_Z, target: new DOMPoint(0.0, 0.0, 1.0),  up: new DOMPoint(0.0, -1.0, 0.0) },
    { face: gl.TEXTURE_CUBE_MAP_NEGATIVE_Z, target: new DOMPoint(0.0, 0.0, -1.0), up: new DOMPoint(0.0, -1.0, 0.0) }
  ];
}

export function renderSceneToCubemap(gl, framebuffer, cubemapTexture, size, renderSceneCallback) {

}
