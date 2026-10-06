import { PugVariable } from '../models/index';

type Obj = Record<string, unknown>;

const isObj = (v: unknown): v is Obj => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * Builds the empty-by-default data object for the variables a template reads.
 *
 * Paths use `name[]` for "an element of the array `name`": `usuarios[].direccion.ciudad`
 * becomes `{ usuarios: [{ direccion: { ciudad: '' } }] }`, and a trailing `[]`
 * (`habilidades[]`, i.e. `each h in habilidades`) becomes an array with one
 * empty sample element so there is something to fill in.
 * Leaves get a typed default (false / 0 / '' …), never an array unless the template iterates them.
 */
export function buildDataSkeleton(variables: PugVariable[]): Obj {
  const data: Obj = {};
  for (const v of variables) {
    const segments = v.path.split('.');
    let node: Obj = data;
    for (let i = 0; i < segments.length; i++) {
      const isLast = i === segments.length - 1;
      const isArraySeg = segments[i].endsWith('[]');
      const key = segments[i].replace(/\[\]$/, '');

      if (isArraySeg) {
        if (!Array.isArray(node[key])) node[key] = [];
        const arr = node[key] as unknown[];
        if (isLast) {
          // Element of a primitive array: keep one sample element.
          if (arr.length === 0) arr.push(v.type === 'array' || v.type === 'object' ? {} : v.defaultValue ?? '');
          break;
        }
        if (arr.length === 0) arr.push({});
        if (!isObj(arr[0])) arr[0] = {};
        node = arr[0] as Obj;
        continue;
      }

      if (isLast) {
        if (!(key in node)) node[key] = structuredClone(v.defaultValue);
        break;
      }
      if (!isObj(node[key])) node[key] = {};
      node = node[key] as Obj;
    }
  }
  return data;
}
