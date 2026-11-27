import { createRepositorySlice, pick } from './createRepositorySlice';

/** Documents an owner must upload before a property can be approved. */
export const REQUIRED_DOCUMENTS = [
  { type: 'ownership_proof', label: 'Ownership proof', hint: 'Sale deed, property tax receipt or registered lease agreement' },
  { type: 'id_proof', label: 'Owner ID proof', hint: 'Aadhaar, PAN, passport or driving licence' },
  { type: 'fire_safety_certificate', label: 'Fire safety certificate', hint: 'Fire NOC from the local fire department' },
];
export const OPTIONAL_DOCUMENTS = [
  { type: 'trade_license', label: 'Trade licence', hint: 'Municipal trade / PG licence, if you have one' },
];
export const DOCUMENT_LABEL = Object.fromEntries([...REQUIRED_DOCUMENTS, ...OPTIONAL_DOCUMENTS, { type: 'other', label: 'Other document' }].map((d) => [d.type, d.label]));
export const DOCUMENT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp';
export const DOCUMENT_MAX_MB = 5;

/** Client-side check before uploading (the server checks again). */
export function documentFileError(file) {
  if (!file) return 'Choose a file';
  if (!/\.(pdf|jpe?g|png|webp)$/i.test(file.name)) return 'Use a PDF, JPG, PNG or WEBP file';
  if (file.size === 0) return 'This file is empty. Choose the actual document';
  if (file.size > DOCUMENT_MAX_MB * 1024 * 1024) return `File must be under ${DOCUMENT_MAX_MB} MB`;
  return '';
}

// Repository: property_documents (verification files + the admin's review).
//   createItem({ propertyId, docType, file })  → multipart upload (owner / admin)
//   updateItem({ id, changes: { status, reviewNote } }) → admin review
export const propertyDocumentsRepo = createRepositorySlice({
  name: 'propertyDocuments',
  base: '/property-documents',
  updateMethod: 'patch',
  toCreate: ({ propertyId, docType, file }) => {
    const form = new FormData();
    form.append('propertyId', String(propertyId));
    form.append('docType', docType);
    form.append('file', file);
    return form;
  },
  toUpdate: (c) => pick(c, ['status', 'reviewNote']),
});
