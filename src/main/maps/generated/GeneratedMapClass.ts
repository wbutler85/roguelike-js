import TileSet, { TileSetName } from '../../tiles/TileSet';
import MapLayout from '../MapLayout';
import memoize from '../../utils/memoize';
import GeneratedMapModel from './GeneratedMapModel';

type GeneratedMapClass = {
  layout: MapLayout,
  tileSet: TileSetName,
  levelNumber: number,
  width: number,
  height: number,
  enemies: Record<string, number>,   // keys correspond to models in data/units
  equipment: Record<string, number>, // keys correspond to models in data/equipment
  items: Record<string, number>      // keys defined in ItemClass.ts
};

const _fromModel = async (model: GeneratedMapModel): Promise<GeneratedMapClass> => {
  return {
    ...model,
    layout: model.layout as MapLayout,
    tileSet: model.tileSet as TileSetName
  };
};

namespace GeneratedMapClass {
  export const fromModel = _fromModel;
  export const load = async (id: string) => fromModel(await GeneratedMapModel.load(id));
}

export default GeneratedMapClass;
