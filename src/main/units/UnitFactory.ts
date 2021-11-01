import SpriteFactory from '../graphics/sprites/SpriteFactory';
import Equipment from '../items/equipment/Equipment';
import EquipmentClass from '../items/equipment/EquipmentClass';
import ItemFactory from '../items/ItemFactory';
import UnitController from './controllers/UnitController';
import UnitClass from './UnitClass';
import Unit from './Unit';
import { HUMAN_DETERMINISTIC } from './controllers/AIUnitControllers';
import { Coordinates } from '../types/types';
import { randChoice } from '../utils/random';

type CreateUnitProps = {
  name: string,
  unitClass: UnitClass,
  controller: UnitController,
  level: number,
  coordinates: Coordinates
};

const createUnit = async ({ name, unitClass, controller, level, coordinates }: CreateUnitProps): Promise<Unit> => {
  const sprite = await SpriteFactory.createUnitSprite(unitClass.sprite, unitClass.paletteSwaps);
  const equipment: Equipment[] = await Promise.all(
    (unitClass.equipment || [])?.map(ItemFactory.createEquipment)
  );

  return new Unit({
    name,
    unitClass,
    controller,
    level,
    coordinates,
    equipment,
    sprite
  });
};

const createRandomEnemy = async ({ x, y }: Coordinates, level: number): Promise<Unit> => {
  const candidates = UnitClass.getEnemyClasses()
    .filter(unitClass => level >= unitClass.minLevel)
    .filter(unitClass => level <= unitClass.maxLevel);

  const unitClass = randChoice(candidates);
  return createUnit({
    name: unitClass.name, // TODO - individual unit names
    unitClass,
    controller: HUMAN_DETERMINISTIC,
    level,
    coordinates: { x, y }
  });
};

export default {
  createUnit,
  createRandomEnemy
};
