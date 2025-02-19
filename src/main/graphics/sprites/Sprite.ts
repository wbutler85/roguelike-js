/**
 * Note: It's expected that a separate Sprite instance will be created
 * per entity, and frame caching will be handled... somewhere else
 */
import { Offsets } from '../../types/types';

abstract class Sprite {
  dx: number;
  dy: number;

  protected constructor({ dx, dy }: Offsets) {
    this.dx = dx;
    this.dy = dy;
  }

  abstract getImage(): ImageBitmap | null;
}

export default Sprite;
