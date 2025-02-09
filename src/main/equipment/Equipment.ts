import Sprite from '../graphics/sprites/Sprite';
import Animatable from '../types/Animatable';
import Direction from '../geometry/Direction';
import Unit from '../units/Unit';
import InventoryItem from '../items/InventoryItem';
import { checkNotNull } from '../utils/preconditions';
import EquipmentModel from './EquipmentModel';
import EquipmentSlot from './EquipmentSlot';

class Equipment implements Animatable {
  readonly inventoryItem: InventoryItem | null;
  readonly damage?: number;
  readonly sprite: Sprite;
  readonly slot: EquipmentSlot;
  readonly name: string;
  private _unit: Unit | null;

  constructor(model: EquipmentModel, sprite: Sprite, inventoryItem: InventoryItem | null) {
    this.name = model.name;
    this.slot = model.slot;
    this.inventoryItem = inventoryItem;
    this.damage = model.damage;
    this.sprite = sprite;
    this._unit = null;
  }

  attach = (unit: Unit) => { this._unit = unit; };

  getUnit = () => this._unit;

  /**
   * @override {@link Animatable#getAnimationKey}
   */
  getAnimationKey = () => {
    const unit = checkNotNull(this._unit);
    return `${unit.activity.toLowerCase()}_${Direction.toString(unit.direction)}`;
  };
}

export default Equipment;
