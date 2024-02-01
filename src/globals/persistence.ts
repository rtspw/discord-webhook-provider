import { JsonDB, Config } from 'node-json-db'

export const persistence = new JsonDB(new Config('persistence', true, false, '/'))
