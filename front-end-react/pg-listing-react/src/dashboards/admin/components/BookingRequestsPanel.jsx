import { useEffect } from 'react';
import useScreenState from '../../../app/useScreenState';
import { useDispatch, useSelector } from 'react-redux';
import { runThunk } from '../../../app/hooks';
import { STATUS } from '../../../data/catalog';
import { adminProperties, adminUsers } from '../../../features/admin/adminSlices';
import { bookingRequests } from '../../../features/bookingRequests/bookingRequestsSlice';
import { formatDate, statusLabel } from '../../../utils/normalize';
import Modal from './Modal';

const REQUEST_STATUSES = STATUS.bookingRequest;
const EMPTY_FORM = { tenantId: '', propertyId: '', roomId: '', requestedDate: '', message: '', status: 'pending' };

export default function BookingRequestsPanel() {
  const dispatch = useDispatch();
  const { items: requests, status, error, mutating } = useSelector(bookingRequests.selectors.selectSlice);
  const users = useSelector(adminUsers.selectors.selectItems);
  const properties = useSelector(adminProperties.selectors.selectItems);
  const usersLoading = useSelector(adminUsers.selectors.selectIsLoading);
  const propertiesLoading = useSelector(adminProperties.selectors.selectIsLoading);
  const usersError = useSelector(adminUsers.selectors.selectError);
  const propertiesError = useSelector(adminProperties.selectors.selectError);
  const [filter, setFilter] = useScreenState('all');
  const [dialog, setDialog] = useScreenState(null);
  const [form, setForm] = useScreenState(EMPTY_FORM);

  const selected = useSelector((state) => bookingRequests.selectors.selectById(state, dialog?.id));
  const loading = status === 'loading';
  const creating = dialog?.type === 'create';
  const editing = dialog?.type === 'edit';
  const removing = dialog?.type === 'delete';
  const showEditor = creating || (editing && selected);
  const propertyId = creating ? form.propertyId : selected?.propertyId;
  const property = properties.find((p) => String(p.id) === String(propertyId));
  const rooms = property?.roomEntities || [];
  const tenants = users.filter((user) => user.role === 'tenant');
  const visible = requests.filter((request) => filter === 'all' || request.status === filter);

  useEffect(() => {
    dispatch(bookingRequests.thunks.fetchAll());
  }, [dispatch]);

  const close = () => { if (!mutating) setDialog(null); };
  const change = (name, value) => setForm((previous) => ({ ...previous, [name]: value }));

  function openCreate() {
    setForm(EMPTY_FORM);
    setDialog({ type: 'create' });
    dispatch(adminUsers.thunks.fetchAll());
    dispatch(adminProperties.thunks.fetchAll());
  }

  function openEdit(request) {
    // The dialog keeps the record ID and a draft of the editable fields.
    setDialog({ type: 'edit', id: request.id });
    setForm({ ...EMPTY_FORM, roomId: String(request.roomId ?? ''), status: request.status || 'pending', message: request.message || '' });
    if (!properties.length && !propertiesLoading) dispatch(adminProperties.thunks.fetchAll());
  }

  async function save(event) {
    event.preventDefault();
    if (mutating || loading || !showEditor) return;
    if (creating && (!form.tenantId || !form.propertyId)) return;
    const roomId = form.roomId ? Number(form.roomId) : null;
    const message = form.message.trim();
    const action = creating
      ? bookingRequests.thunks.createItem({
        tenantId: Number(form.tenantId),
        propertyId: Number(form.propertyId),
        roomId: roomId ?? undefined,
        requestedDate: form.requestedDate || undefined,
        message: message || undefined,
      })
      : bookingRequests.thunks.updateItem({ id: selected.id, changes: { roomId, status: form.status, message } });

    const { ok } = await runThunk(dispatch, action, { success: creating ? 'Booking request created' : 'Booking request updated' });
    if (ok) setDialog(null);
  }

  async function remove() {
    if (!selected || mutating || loading) return;
    const { ok } = await runThunk(dispatch, bookingRequests.thunks.removeItem(selected.id), { success: 'Booking request deleted' });
    if (ok) setDialog(null);
  }

  const canSave = !mutating && !loading && (creating
    ? Boolean(form.tenantId && form.propertyId) && !usersLoading && !propertiesLoading
    : Boolean(selected));

  function roomLabel(request) {
    if (request.roomId == null) return '—';
    const room = properties.find((p) => p.id === request.propertyId)?.roomEntities
      ?.find((record) => record.id === request.roomId);
    const relatedRoom = request.roomEntity?.id === request.roomId ? request.roomEntity : null;
    return (room || relatedRoom)?.roomNumber || `Room #${request.roomId}`;
  }

  return (
    <section className="booking-requests" aria-labelledby="booking-requests-heading">
      <div className="sec-hdr">
        <h2 id="booking-requests-heading">Booking Requests</h2>
        <p>Review requests before checkout.</p>
      </div>
      <div className="tbl-wrap">
        <div className="tbl-hdr">
          <label htmlFor="booking-request-filter">Status</label>
          <select id="booking-request-filter" className="sel" value={filter} onChange={(event) => setFilter(event.target.value)}>
            <option value="all">All statuses</option>
            {REQUEST_STATUSES.map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}
          </select>
          <button className="btn-cancel" type="button" disabled={loading || mutating} onClick={() => dispatch(bookingRequests.thunks.fetchAll())}>
            Refresh
          </button>
          <button className="btn-add" type="button" disabled={loading || mutating} onClick={openCreate}>New Request</button>
        </div>
        {error && <p className="tbl-footer" role="alert">{error}</p>}
        <table>
          <thead>
            <tr><th>Tenant</th><th>Property</th><th>Room</th><th>Requested date</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {visible.map((request) => (
              <tr key={request.id}>
                <td>{request.tenant?.name || users.find((user) => user.id === request.tenantId)?.name || `Tenant #${request.tenantId}`}</td>
                <td>{request.property?.name || properties.find((p) => p.id === request.propertyId)?.name || `Property #${request.propertyId}`}</td>
                <td>{roomLabel(request)}</td>
                <td>{formatDate(request.requestedDate)}</td>
                <td><span className={`badge badge-${request.status}`}>{statusLabel(request.status)}</span></td>
                <td>
                  <div className="act-icons">
                    <button className="ico-btn edit" type="button" disabled={loading || mutating} onClick={() => openEdit(request)} title="Edit request" aria-label="Edit request">
                      <span className="material-icons-outlined">edit</span>
                    </button>
                    <button className="ico-btn danger" type="button" disabled={loading || mutating} onClick={() => setDialog({ type: 'delete', id: request.id })} title="Delete request" aria-label="Delete request">
                      <span className="material-icons-outlined">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr><td colSpan={6}>{loading || status === 'idle' ? 'Loading booking requests…' : 'No booking requests to show.'}</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal show={Boolean(dialog)} onClose={close}
        title={creating ? 'New Booking Request' : removing ? 'Delete Booking Request' : 'Edit Booking Request'}
        footer={
          <>
            <button className="btn-cancel" type="button" disabled={mutating} onClick={close}>Cancel</button>
            {showEditor && <button className="btn-confirm-blue" type="submit" form="booking-request-form" disabled={!canSave}>Save Request</button>}
            {removing && selected && <button className="btn-confirm-red" type="button" disabled={loading || mutating} onClick={remove}>Delete Request</button>}
          </>
        }>
        {showEditor && (
          <form id="booking-request-form" onSubmit={save}>
            {creating ? (
              <>
                <div className="modal-field">
                  <label htmlFor="booking-request-tenant">Tenant</label>
                  <select id="booking-request-tenant" className="sel" required value={form.tenantId} onChange={(event) => change('tenantId', event.target.value)} disabled={usersLoading || mutating}>
                    <option value="">{usersLoading ? 'Loading tenants…' : 'Select a tenant'}</option>
                    {tenants.map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}
                  </select>
                </div>
                <div className="modal-field">
                  <label htmlFor="booking-request-property">Property</label>
                  <select id="booking-request-property" className="sel" required value={form.propertyId} disabled={propertiesLoading || mutating}
                    onChange={(event) => setForm((previous) => ({ ...previous, propertyId: event.target.value, roomId: '' }))}>
                    <option value="">{propertiesLoading ? 'Loading properties…' : 'Select a property'}</option>
                    {properties.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </div>
                <div className="modal-field">
                  <label htmlFor="booking-request-date">Requested date</label>
                  <input id="booking-request-date" type="date" value={form.requestedDate} disabled={mutating} onChange={(event) => change('requestedDate', event.target.value)} />
                </div>
              </>
            ) : (
              <div className="modal-field">
                <label htmlFor="booking-request-status">Status</label>
                <select id="booking-request-status" className="sel" value={form.status} disabled={mutating} onChange={(event) => change('status', event.target.value)}>
                  {!REQUEST_STATUSES.includes(form.status) && <option value={form.status}>{statusLabel(form.status)}</option>}
                  {REQUEST_STATUSES.map((value) => <option key={value} value={value}>{statusLabel(value)}</option>)}
                </select>
              </div>
            )}
            <div className="modal-field">
              <label htmlFor="booking-request-room">Room</label>
              <select id="booking-request-room" className="sel" value={form.roomId} disabled={mutating || !propertyId} onChange={(event) => change('roomId', event.target.value)}>
                <option value="">Any room</option>
                {form.roomId && !rooms.some((room) => String(room.id) === form.roomId) && (
                  <option value={form.roomId}>{selected && form.roomId === String(selected.roomId) ? roomLabel(selected) : `Room #${form.roomId}`}</option>
                )}
                {rooms.map((room) => <option key={room.id} value={room.id}>{room.roomNumber}</option>)}
              </select>
            </div>
            <div className="modal-field">
              <label htmlFor="booking-request-message">Message</label>
              <textarea id="booking-request-message" value={form.message} disabled={mutating} onChange={(event) => change('message', event.target.value)} />
            </div>
            {creating && (usersError || propertiesError) && <p role="alert">{usersError || propertiesError}</p>}
          </form>
        )}
        {removing && selected && <p>Permanently delete booking request #{selected.id}?</p>}
        {dialog && !creating && !selected && <p role="status">This request is no longer available.</p>}
      </Modal>
    </section>
  );
}
