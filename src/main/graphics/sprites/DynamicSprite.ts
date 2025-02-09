import Animatable from '../../types/Animatable';
import PaletteSwaps from '../../types/PaletteSwaps';
import { Offsets } from '../../types/types';
import { checkNotNull } from '../../utils/preconditions';
import Sprite from './Sprite';

type Props<T> = {
  offsets: Offsets,
  paletteSwaps: PaletteSwaps,
  imageMap: Record<string, ImageBitmap>
};

class DynamicSprite<T extends Animatable> extends Sprite {
  // TODO why is this nullable?
  target: T | null;
  private readonly paletteSwaps: PaletteSwaps;
  private readonly imageMap: Record<string, ImageBitmap>;

  constructor({ offsets, paletteSwaps, imageMap }: Props<T>) {
    super(offsets);
    this.target = null;
    this.paletteSwaps = paletteSwaps;
    this.imageMap = imageMap;
  }

  /**
   * @override {@link Sprite#getImage}
   */
  getImage = (): ImageBitmap => {
    const target = checkNotNull(this.target);
    const frameKey = target.getAnimationKey();
    return this.imageMap[frameKey];
  };
}

export default DynamicSprite;
