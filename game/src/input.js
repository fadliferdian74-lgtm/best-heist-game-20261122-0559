// The Gilded Hour — keyboard and mouse state, kept as one small object the
// rest of the game polls. Keys are tracked by their KeyboardEvent.code so
// the layout never matters; "pressed" edges are consumed once per frame.

export class Input {
  constructor(canvas) {
    this.down = new Set();
    this.pressedEdges = new Set();
    this.mouse = { x: 0, y: 0, down: false, clicked: false };
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
        e.preventDefault();
      }
      if (!e.repeat) this.pressedEdges.add(e.code);
      this.down.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => {
      this.down.clear();
      this.mouse.down = false;
    });
    canvas.addEventListener('mousemove', (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
      this.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
    });
    canvas.addEventListener('mousedown', () => {
      this.mouse.down = true;
      this.mouse.clicked = true;
    });
    window.addEventListener('mouseup', () => { this.mouse.down = false; });
  }

  // The movement vector the player asked for, normalised.
  moveVector() {
    let x = 0, y = 0;
    if (this.down.has('KeyA') || this.down.has('ArrowLeft')) x -= 1;
    if (this.down.has('KeyD') || this.down.has('ArrowRight')) x += 1;
    if (this.down.has('KeyW') || this.down.has('ArrowUp')) y -= 1;
    if (this.down.has('KeyS') || this.down.has('ArrowDown')) y += 1;
    if (x !== 0 && y !== 0) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
    return { x, y };
  }

  sneaking() {
    return this.down.has('ShiftLeft') || this.down.has('ShiftRight');
  }

  held(code) {
    return this.down.has(code);
  }

  // True once, on the frame the key went down.
  pressed(code) {
    return this.pressedEdges.has(code);
  }

  clicked() {
    return this.mouse.clicked;
  }

  // Called by the game loop after each update: edges live for one frame.
  endFrame() {
    this.pressedEdges.clear();
    this.mouse.clicked = false;
  }
}
