import Equipment from '../../equipment/Equipment';
import Door, { DoorDirection, DoorState } from '../../objects/Door';
import Spawner, { SpawnerState } from '../../objects/Spawner';
import { Colors } from '../../types/Color';
import Direction from '../../geometry/Direction';
import PaletteSwaps from '../../types/PaletteSwaps';
import Unit from '../../units/Unit';
import { fillTemplate } from '../../utils/templates';
import ImageBuilder from '../images/ImageBuilder';
import { replaceAll } from '../images/ImageUtils';
import DynamicSprite from './DynamicSprite';
import DynamicSpriteModel from './DynamicSpriteModel';
import Sprite from './Sprite';
import StaticSprite from './StaticSprite';
import StaticSpriteModel from './StaticSpriteModel';

type SpriteCategory = 'units' | 'equipment' | 'static';

/**
 * Tiles don't use JSON models and are assumed to use baseline parameters (white = transparent, offsets = (0, 0))
 */
const createTileSprite = async (filename: string, paletteSwaps: PaletteSwaps = {}): Promise<Sprite> => {
  const offsets = { dx: 0, dy: 0 };
  const transparentColor = Colors.WHITE;
  const image = await new ImageBuilder({
    filename: `tiles/${filename}`,
    paletteSwaps,
    transparentColor
  }).build();
  return new StaticSprite(image, offsets);
};

const createStaticSprite = async (spriteName: string, paletteSwaps: PaletteSwaps = {}): Promise<Sprite> => {
  const model: StaticSpriteModel = await loadSpriteModel(spriteName, 'static');
  const { offsets, transparentColor } = model;
  const image = await new ImageBuilder({
    filename: model.filename,
    paletteSwaps,
    transparentColor
  }).build();
  return new StaticSprite(image, offsets);
};

const createUnitSprite = async (spriteName: string, paletteSwaps: PaletteSwaps = {}): Promise<DynamicSprite<Unit>> => {
  const spriteModel: DynamicSpriteModel = await loadSpriteModel(spriteName, 'units');
  const imageMap = _loadAnimations('units', spriteModel, paletteSwaps);

  return new DynamicSprite<Unit>({
    paletteSwaps,
    imageMap,
    offsets:
    spriteModel.offsets
  });
};

const createEquipmentSprite = async (spriteName: string, paletteSwaps: PaletteSwaps = {}) => {
  const spriteModel: DynamicSpriteModel = await loadSpriteModel(spriteName, 'equipment');
  const imageMap = _loadAnimations('equipment', spriteModel, paletteSwaps);

  return new DynamicSprite<Equipment>({
    paletteSwaps,
    imageMap,
    offsets:
    spriteModel.offsets
  });
};

/**
 * TODO - these aren't in JSON but hardcoded here
 */
const createProjectileSprite = async (spriteName: string, direction: Direction, paletteSwaps: PaletteSwaps={}) => {
  const filename = `${spriteName}/${spriteName}_${Direction.toString(direction)}_1`;
  const offsets = { dx: 0, dy: -8 };
  const image = await new ImageBuilder({
    filename,
    paletteSwaps,
    transparentColor: Colors.WHITE
  }).build();
  return new StaticSprite(image, offsets);
};

/**
 * TODO - hardcoded
 */
const createDoorSprite = async (): Promise<DynamicSprite<Door>> => {
  const offsets = { dx: 0, dy: -24 };
    // TODO hardcoded
  const paletteSwaps = {
    //[Colors.DARK_RED]: Colors.YELLOW_CGA,
    //[Colors.DARK_BROWN]: Colors.LIGHT_MAGENTA_CGA,
    //[Colors.BLACK]: Colors.BLACK_CGA
  };
  const imageMap: Record<string, () => Promise<ImageBitmap>> = {};
  for (const direction of DoorDirection.values()) {
    for (const state of DoorState.values()) {
      const key = `${direction.toLowerCase()}_${state.toLowerCase()}`;
      const filename = `door_${direction.toLowerCase()}_${state.toLowerCase()}`;
      const imageSupplier = () => new ImageBuilder({
        filename,
        paletteSwaps: {
          [Colors.DARK_RED]: Colors.YELLOW_CGA,
          [Colors.DARK_BROWN]: Colors.LIGHT_MAGENTA_CGA,
          [Colors.BLACK]: Colors.BLACK_CGA
        },
        transparentColor: Colors.WHITE
      }).build();
      imageMap[key] = imageSupplier;
    }
  }
  return new DynamicSprite<Door>({
    offsets,
    paletteSwaps,
    imageMap
  });
};

const createMirrorSprite = async (): Promise<DynamicSprite<Spawner>> => {
  const imageMap: Record<string, () => Promise<ImageBitmap>> = {};
  for (const state of SpawnerState.values()) {
    const key = `${state.toLowerCase()}`;
    const filename: string = (() => {
      switch (state) {
        case 'ALIVE': return 'mirror';
        case 'DEAD':  return 'mirror_broken';
      }
      throw new Error(); // wat
    })();
    const imageSupplier = () => new ImageBuilder({
      filename,
      transparentColor: Colors.WHITE
    }).build();
    imageMap[key] = imageSupplier;
  }

  const offsets = { dx: -4, dy: -20 };
  return new DynamicSprite<Spawner>({
    offsets,
    paletteSwaps: {},
    imageMap
  });
};

const _loadAnimations = (
  spriteCategory: SpriteCategory,
  spriteModel: DynamicSpriteModel,
  paletteSwaps: PaletteSwaps
): Record<string, () => Promise<ImageBitmap>> => {
  const imageMap: Record<string, () => Promise<ImageBitmap>> = {};

  for (const [animationName, animation] of Object.entries(spriteModel.animations)) {
    for (const direction of Direction.values()) {
      for (let i = 1; i <= animation.frames.length; i++) { // 1-indexed
        const frame = animation.frames[i - 1];
        const variables = {
          sprite: spriteModel.name,
          activity: frame.activity,
          direction: Direction.toLegacyDirection(direction),
          number: frame.number
        };

        const patterns = animation.pattern ? [animation.pattern]
          : spriteModel.patterns ? spriteModel.patterns
          : spriteModel.pattern ? [spriteModel.pattern]
          : [];

        const filenames = patterns.map(pattern => `${spriteCategory}/${spriteModel.name}/${pattern}`)
          .map(pattern => fillTemplate(pattern, variables));

        const effects = (animationName === 'DAMAGED')
          ? [(img: ImageData) => replaceAll(img, Colors.WHITE)]
          : [];

        const frameKey = `${animationName}_${Direction.toString(direction)}_${i}`;

        const imageSupplier = () => new ImageBuilder({
          filenames,
          transparentColor: Colors.WHITE,
          paletteSwaps,
          effects
        }).build();

        imageMap[frameKey] = imageSupplier;
      }
    }
  }

  return imageMap;
};

const loadSpriteModel = async <T> (name: string, category: SpriteCategory): Promise<T> => {
  return (await import(
    /* webpackMode: "eager" */
    `../../../../data/sprites/${category}/${name}.json`
  )).default;
};

export default {
  createDoorSprite,
  createEquipmentSprite,
  createMirrorSprite,
  createProjectileSprite,
  createStaticSprite,
  createTileSprite,
  createUnitSprite
};
