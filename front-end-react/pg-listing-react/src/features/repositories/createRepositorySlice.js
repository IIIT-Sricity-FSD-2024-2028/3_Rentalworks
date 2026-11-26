import { http, qs } from '../../services/apiClient';
import { createResourceSlice } from '../shared/createResourceSlice';

/**
 * One Redux slice per backend repository (database table), each with exactly
 * four CRUD thunks, all synchronised with the API:
 *
 *   fetchAll   → GET    <base>[?params]
 *   createItem → POST   <base>
 *   updateItem → PUT/PATCH <base>/:id
 *   removeItem → DELETE <base>/:id
 *
 * The backend decides what each role may see; the slice only picks which
 * controller to call for the signed-in role:
 *
 *   base:     '/rooms'                       same controller for every role
 *   roleBase: { owner: '/api/properties' }   role-specific controller
 *   listPath: { tenant: '/issues/my' }       role-specific list endpoint
 *   toCreate / toUpdate (data, role) → body  only the fields the DTO accepts
 */
export function createRepositorySlice({
  name,
  base,
  roleBase = {},
  listPath = {},
  updateMethod = 'put',
  roleUpdateMethod = {},
  toCreate = (data) => data,
  toUpdate = (changes) => changes,
  mapItem,
  reducers,
  extraReducers,
}) {
  const baseFor = (role) => roleBase[role] || base;
  const methodFor = (role) => roleUpdateMethod[role] || updateMethod;

  return createResourceSlice({
    name,
    mapItem,
    reducers,
    extraReducers,
    api: {
      list: (params, role) => http.get(`${listPath[role] || baseFor(role)}${qs(params && typeof params === 'object' ? params : {})}`),
      create: (data, role) => http.post(baseFor(role), toCreate(data, role)),
      update: (id, changes, role) => http[methodFor(role)](`${baseFor(role)}/${id}`, toUpdate(changes, role)),
      remove: (id, role) => http.delete(`${baseFor(role)}/${id}`),
    },
  });
}

/** Keep only the listed keys that have a value. */
export const pick = (obj = {}, keys) =>
  Object.fromEntries(keys.filter((k) => obj[k] !== undefined && obj[k] !== '').map((k) => [k, obj[k]]));
