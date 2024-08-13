

export class EnhancedDOMPoint extends DOMPoint {
  add_(otherVector) {
    this.addVectors(this, otherVector);
    return this;
  }

  addVectors(v1, v2) {
    this.x = v1.x + v2.x;
    this.y = v1.y + v2.y;
    this.z = v1.z + v2.z;
    return this;
  }

  set(x, y, z) {
    if (x && typeof x === 'object') {
      y = x.y;
      z = x.z;
      x = x.x;
    }
    this.x = x != null ? x : this.x;
    this.y = y != null ? y : this.y;
    this.z = z != null ? z : this.z;
    return this;
  }

  clone_() {
    return new EnhancedDOMPoint(this.x, this.y, this.z, this.w);
  }

  scale_(scaleBy) {
    this.x *= scaleBy;
    this.y *= scaleBy;
    this.z *= scaleBy;
    return this;
  }

  subtract(otherVector) {
   this.subtractVectors(this, otherVector);
    return this;
  }

  subtractVectors(v1, v2) {
    this.x = v1.x - v2.x;
    this.y = v1.y - v2.y;
    this.z = v1.z - v2.z;
    return this;
  }

  crossVectors(v1, v2) {
    const x = v1.y * v2.z - v1.z * v2.y;
    const y = v1.z * v2.x - v1.x * v2.z;
    const z = v1.x * v2.y - v1.y * v2.x;
    this.x = x
    this.y = y
    this.z = z
    return this;
  }

  dot(otherVector) {
    return this.x * otherVector.x + this.y * otherVector.y + this.z * otherVector.z;
  }

  toArray() {
    return [this.x, this.y, this.z];
  }

  get magnitude() {
    return Math.hypot(...this.toArray());
  }

  normalize_() {
    const magnitude = this.magnitude;
    if (magnitude === 0) {
      return new EnhancedDOMPoint();
    }
    this.x /= magnitude;
    this.y /= magnitude;
    this.z /= magnitude;
    return this;
  }

  lerp(otherVector, alpha) {
    this.x += ( otherVector.x - this.x ) * alpha;
    this.y += ( otherVector.y - this.y ) * alpha;
    this.z += ( otherVector.z - this.z ) * alpha;
    return this;
  }

  modifyComponents(callback) {
    this.x = callback(this.x);
    this.y = callback(this.y);
    this.z = callback(this.z);
    return this;
  }

  isEqualTo(otherVector) {
    return this.x === otherVector.x && this.y === otherVector.y && this.z === otherVector.z;
  }
}
