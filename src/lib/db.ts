import { createRxDatabase, addRxPlugin, RxDatabase, RxCollection } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode';
import { wrappedValidateAjvStorage } from 'rxdb/plugins/validate-ajv';

// 開発環境のみdev-modeを有効化
if (process.env.NODE_ENV === 'development') {
  addRxPlugin(RxDBDevModePlugin);
}

// --- Schemas ---

const fieldSchema = {
  title: 'field schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    min: { type: 'number' },
    max: { type: 'number' },
    unit: { type: 'string' },
  },
  required: ['id', 'name', 'min', 'max', 'unit'],
};

const profileSchema = {
  title: 'profile schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    name: { type: 'string' },
    color: { type: 'string' },
  },
  required: ['id', 'name', 'color'],
};

const entrySchema = {
  title: 'entry schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 100 },
    profileId: { type: 'string' },
    label: { type: 'string' },
    values: { type: 'object', additionalProperties: { type: 'number' } },
    visible: { type: 'boolean' },
  },
  required: ['id', 'profileId', 'label', 'values', 'visible'],
};

// --- Database & Collections ---

export type FieldDoc = {
  id: string;
  name: string;
  min: number;
  max: number;
  unit: string;
};

export type ProfileDoc = {
  id: string;
  name: string;
  color: string;
};

export type EntryDoc = {
  id: string;
  profileId: string;
  label: string;
  values: Record<string, number>;
  visible: boolean;
};

type MyCollections = {
  fields: RxCollection<FieldDoc>;
  profiles: RxCollection<ProfileDoc>;
  entries: RxCollection<EntryDoc>;
};

export type MyDatabase = RxDatabase<MyCollections>;

let dbPromise: Promise<MyDatabase> | null = null;

export const getDatabase = async (): Promise<MyDatabase> => {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await createRxDatabase<MyCollections>({
        name: 'universal_param_v4', // 新しいDB名
        storage: wrappedValidateAjvStorage({
          storage: getRxStorageDexie(),
        }),
      });

      await db.addCollections({
        fields: { schema: fieldSchema },
        profiles: { schema: profileSchema },
        entries: { schema: entrySchema },
      });

      return db;
    })();
  }
  return dbPromise;
};
