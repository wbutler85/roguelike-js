import ImageSupplier from '../ImageSupplier';
import Sprite from './Sprite';
import { PaletteSwaps, SpriteSupplier } from '../../types/types';
import PlayerSprite from './PlayerSprite';
import Colors from '../../types/Colors';
import Unit from '../../units/Unit';

const DEFAULT_SPRITE_KEY = 'default';

function _staticSprite(imageLoader: ImageSupplier, { dx, dy }: { dx: number, dy: number }): Sprite {
  return new Sprite({ [DEFAULT_SPRITE_KEY]: imageLoader }, DEFAULT_SPRITE_KEY, { dx, dy });
}

const StaticSprites: { [name: string]: SpriteSupplier } = {
  WALL_TOP: (paletteSwaps) => _staticSprite(new ImageSupplier('tile_wall', Colors.WHITE, paletteSwaps), { dx: 0, dy: 0 }),
  WALL_HALL: (paletteSwaps) => _staticSprite(new ImageSupplier('tile_wall_hall', Colors.WHITE, paletteSwaps), { dx: 0, dy: 0 }),
  FLOOR: (paletteSwaps) => _staticSprite(new ImageSupplier('tile_floor', Colors.WHITE, paletteSwaps), { dx: 0, dy: 0 }),
  FLOOR_HALL: (paletteSwaps) => _staticSprite(new ImageSupplier('tile_floor_hall', Colors.WHITE, paletteSwaps), { dx: 0, dy: 0 }),
  MAP_SWORD: (paletteSwaps) => _staticSprite(new ImageSupplier('sword_icon_small', Colors.WHITE, paletteSwaps), { dx: 0, dy: -8 }),
  MAP_POTION: (paletteSwaps) => _staticSprite(new ImageSupplier('potion_small', Colors.WHITE, paletteSwaps), { dx: 0, dy: -8 }),
  MAP_SCROLL: (paletteSwaps) => _staticSprite(new ImageSupplier('scroll_icon', Colors.WHITE, paletteSwaps), { dx: 0, dy: 0 }),
  STAIRS_DOWN: (paletteSwaps) => _staticSprite(new ImageSupplier('stairs_down2', Colors.WHITE, paletteSwaps), { dx: 0, dy: 0 })
};

export default {
  WALL_TOP: StaticSprites.WALL_TOP,
  WALL_HALL: StaticSprites.WALL_HALL,
  FLOOR: StaticSprites.FLOOR,
  FLOOR_HALL: StaticSprites.FLOOR_HALL,
  MAP_SWORD: StaticSprites.MAP_SWORD,
  MAP_POTION: StaticSprites.MAP_POTION,
  MAP_SCROLL: StaticSprites.MAP_SCROLL,
  STAIRS_DOWN: StaticSprites.STAIRS_DOWN,
  PLAYER: (unit: Unit, paletteSwaps: PaletteSwaps) => new PlayerSprite(unit, paletteSwaps)
};