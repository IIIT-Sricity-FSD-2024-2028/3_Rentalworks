import { http, qs } from '../../services/apiClient';
import { createResourceSlice } from '../shared/createResourceSlice';

// Project the API relations to the fields used in Warden Tenant Records.
function mapStayFromDb(stay) {
  return {
    id: stay.id,
    tenantId: stay.tenantId ?? stay.tenant?.id ?? null,
    tenantName: stay.tenant?.name || `Tenant #${stay.tenantId}`,
    propertyId: stay.propertyId ?? stay.property?.id ?? null,
    propertyName: stay.property?.name || '',
    roomId: stay.roomId ?? stay.roomEntity?.id ?? null,
    roomNumber: stay.roomEntity?.roomNumber || '',
    bedNumber: stay.bedNumber || '',
    moveInDate: stay.moveInDate || null,
    moveOutDate: stay.moveOutDate || null,
    status: stay.status,
  };
}

export const tenantStays = createResourceSlice({
  name: 'tenantStays',
  api: {
    list: (filters = {}) => http.get(`/tenant-stays${qs(filters)}`),
    create: (data) => http.post('/tenant-stays', data),
    update: (id, changes) => http.put(`/tenant-stays/${id}`, changes),
    remove: (id) => http.delete(`/tenant-stays/${id}`),
  },
  mapItem: mapStayFromDb,
});
