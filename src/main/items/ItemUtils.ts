import Unit from '../units/Unit';
import ItemFactory from './ItemFactory';
import MapItem from './MapItem';
import InventoryItem from './InventoryItem';
import { playSound } from '../sounds/SoundFX';
import Sounds from '../sounds/Sounds';
import EquipmentClass from './equipment/EquipmentClass';

const pickupItem = (unit: Unit, mapItem: MapItem) => {
  const { state } = jwb;
  const { inventoryItem } = mapItem;
  unit.inventory.add(inventoryItem);
  state.messages.push(`Picked up a ${inventoryItem.name}.`);
  playSound(Sounds.PICK_UP_ITEM);
};

const useItem = async (unit: Unit, item: InventoryItem) => {
  await item.use(unit);
  unit.inventory.remove(item);
};

const equipItem = async (item: InventoryItem, equipmentClass: EquipmentClass, unit: Unit) => {
  const equipment = await ItemFactory.createEquipment(equipmentClass.name);
  unit.equipment.add(equipment);
  equipment.attach(unit);
};

export {
  pickupItem,
  useItem,
  equipItem
};
