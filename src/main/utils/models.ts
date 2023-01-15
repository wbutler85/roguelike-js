import Ajv from 'ajv';
import { GeneratedMapModel } from '../../gen-schema/generated-map.schema';
import { UnitModel } from '../../gen-schema/unit.schema';

/**
 * Utility methods for working with models (in /data/) and schemas (in /data/schema)
 */

const schemaNames = [
  'palette-swaps',
  'unit',
  'equipment-stats',
  'equipment',
  'predefined-map',
  'generated-map',
  'static-sprite',
  'dynamic-sprite',
  'tile-set'
];

type SchemaType =
  | 'palette-swaps'
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
      `../../../data/schema/${schemaName}.schema.json`
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

export const loadUnitModel = async (unitClass: string): Promise<UnitModel> => loadModel(`units/${unitClass}`, 'unit');

export const loadGeneratedMapModel = async (id: string): Promise<GeneratedMapModel> => loadModel(`maps/generated/${id}`, 'generated-map');
