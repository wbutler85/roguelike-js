import Ajv from 'ajv';
import { DynamicSpriteModel } from '../../gen-schema/dynamic-sprite.schema';
import { EquipmentModel } from '../../gen-schema/equipment.schema';
import { GeneratedMapModel } from '../../gen-schema/generated-map.schema';
import { PredefinedMapModel } from '../../gen-schema/predefined-map.schema';
import { StaticSpriteModel } from '../../gen-schema/static-sprite.schema';
import { UnitModel } from '../../gen-schema/unit.schema';
import SpriteCategory from '../graphics/sprites/SpriteCategory';

/**
 * Utility methods for working with models (in /data/) and schemas (in /data/schema)
 */

export const schemaNames = [
  'palette-swaps',
  'door-direction',
  'unit-type',
  'tile-type',
  'map-type',
  'map-spec',
  'unit',
  'equipment-stats',
  'equipment-slot',
  'item-category',
  'equipment',
  'predefined-map',
  'generated-map',
  'static-sprite',
  'dynamic-sprite',
  'tile-set'
];

type SchemaType =
  | 'palette-swaps'
  | 'door-direction'
  | 'unit'
  | 'equipment-stats'
  | 'equipment'
  | 'predefined-map'
  | 'generated-map'
  | 'static-sprite'
  | 'dynamic-sprite'
  | 'tile-set';

const ajv = new Ajv();
let loadedSchemas = false;

const _loadSchemas = async () => {
  for (const schemaName of schemaNames) {
    console.debug(`Loading schema ${schemaName}`);
    const schema = (await import(
      /* webpackMode: "lazy-once" */
      /* webpackChunkName: "schemas" */
      `../../../schema/${schemaName}.schema.json`
    )).default;
    ajv.addSchema(schema);
  }
};

export const loadModel = async <T> (path: string, schema: SchemaType): Promise<T> => {
  if (!loadedSchemas) {
    await _loadSchemas();
    loadedSchemas = true;
  }
  const validate = ajv.getSchema(`${schema}.schema.json`);
  if (!validate) {
    throw new Error(`Failed to load schema ${schema}`);
  }

  console.debug(`Validating ${path}`);
  const data = (await import(
    /* webpackMode: "lazy-once" */
    /* webpackChunkName: "models" */
    `../../../data/${path}.json`
  )).default;
  if (!validate(data)) {
    throw new Error(`Failed to validate ${path}:\n${JSON.stringify(validate.errors, null, 4)}`);
  }
  return data as T;
};

export const loadUnitModel = async (id: string): Promise<UnitModel> =>
  loadModel(`units/${id}`, 'unit');

export const loadEquipmentModel = async (id: string): Promise<EquipmentModel> =>
  loadModel(`equipment/${id}`, 'equipment');

export const loadGeneratedMapModel = async (id: string): Promise<GeneratedMapModel> =>
  loadModel(`maps/generated/${id}`, 'generated-map');

export const loadPredefinedMapModel = async (id: string): Promise<PredefinedMapModel> =>
  loadModel(`maps/generated/${id}`, 'predefined-map');

export const loadDynamicSpriteModel = async (id: string, category: SpriteCategory): Promise<DynamicSpriteModel> =>
  loadModel(`sprites/${category}/${id}`, 'dynamic-sprite');

export const loadStaticSpriteModel = async (id: string): Promise<StaticSpriteModel> =>
  loadModel(`sprites/static/${id}`, 'static-sprite');
