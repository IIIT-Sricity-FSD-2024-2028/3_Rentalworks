import { http, qs } from '../../services/apiClient';
import { createResourceSlice } from '../shared/createResourceSlice';

// The tenant reads the catalogue for their property. The server authorizes edits.
export const services = createResourceSlice({
  name: 'services',
  api: {
    list: (propertyId) => http.get(`/services${qs({ propertyId })}`),
    create: (data) => http.post('/services', data),
    update: (id, changes) => http.patch(`/services/${id}`, changes),
    remove: (id) => http.delete(`/services/${id}`),
  },
});
