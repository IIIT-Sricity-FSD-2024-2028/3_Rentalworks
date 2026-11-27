// Picked files in Redux.
//
// Redux only holds plain, serializable data, and a browser File / Blob is
// neither. So the store keeps a plain reference for every picked file
//   { __fileRef: 'file-3', name, size, type, lastModified }
// and the bytes stay here, keyed by that id, until the form that picked them
// is done. Uploads read the real File back through resolveFiles().

const files = new Map(); // id -> File
const ids = new WeakMap(); // File -> id (the same File keeps one id)
let seq = 0;

const isFile = (x) => typeof Blob !== 'undefined' && x instanceof Blob;
const isRef = (x) => Boolean(x && typeof x === 'object' && typeof x.__fileRef === 'string');

function register(file) {
  let id = ids.get(file);
  if (!id) {
    seq += 1;
    id = `file-${seq}`;
    ids.set(file, id);
  }
  files.set(id, file);
  return { __fileRef: id, name: file.name || 'file', size: file.size, type: file.type || '', lastModified: file.lastModified || 0 };
}

/** Files (alone, in arrays or in plain objects) -> serializable references. */
export function toFileRefs(value, owned) {
  if (isFile(value)) {
    const ref = register(value);
    owned?.add(ref.__fileRef);
    return ref;
  }
  if (Array.isArray(value)) return value.map((v) => toFileRefs(v, owned));
  if (value && typeof value === 'object' && !isRef(value)) {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, toFileRefs(v, owned)]));
  }
  return value;
}

/** References -> the real File objects (for previews, validation and upload). */
export function resolveFiles(value) {
  if (isRef(value)) return files.get(value.__fileRef) || null;
  if (Array.isArray(value)) return value.map(resolveFiles).filter((v) => v !== null);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveFiles(v)]));
  }
  return value;
}

/** Every file id referenced inside a value. */
export function referencedIds(value, out = new Set()) {
  if (isRef(value)) out.add(value.__fileRef);
  else if (Array.isArray(value)) value.forEach((v) => referencedIds(v, out));
  else if (value && typeof value === 'object') Object.values(value).forEach((v) => referencedIds(v, out));
  return out;
}

export function releaseFile(id) {
  files.delete(id);
}
