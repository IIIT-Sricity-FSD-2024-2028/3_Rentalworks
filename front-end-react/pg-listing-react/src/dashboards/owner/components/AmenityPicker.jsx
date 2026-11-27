import React, { useState } from 'react';
import Icon from './Icon';
import { AMENITIES, amenityKey } from '../../../utils/normalize';

const STANDARD = Object.values(AMENITIES).map(({ label, icon }) => ({ label, icon }));
const isStandard = (label) => Boolean(AMENITIES[amenityKey(label)]);
const MAX_CUSTOM_LENGTH = 40;

/**
 * Standard amenities as toggles, plus owner-defined ones ("Rooftop garden",
 * "Study room") added with the + Custom button. `value` is a list of labels.
 */
export default function AmenityPicker({ value = [], onChange }) {
  const [adding, setAdding] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const has = (label) => value.some((v) => v.toLowerCase() === label.toLowerCase());
  const toggle = (label) => onChange(has(label) ? value.filter((v) => v.toLowerCase() !== label.toLowerCase()) : [...value, label]);
  const custom = value.filter((v) => !isStandard(v));

  const addCustom = () => {
    const label = text.trim().replace(/\s+/g, ' ');
    if (!label) return setError('Type the amenity name');
    if (label.length > MAX_CUSTOM_LENGTH) return setError(`Keep it under ${MAX_CUSTOM_LENGTH} characters`);
    if (isStandard(label)) {
      // Typed a standard one ("wifi"): just select the standard tile.
      const std = AMENITIES[amenityKey(label)].label;
      if (!has(std)) onChange([...value, std]);
    } else if (has(label)) {
      return setError('Already added');
    } else {
      onChange([...value, label]);
    }
    setText('');
    setError('');
    setAdding(false);
  };

  return (
    <div>
      <div className="amenities-grid">
        {STANDARD.map((a) => (
          <button
            type="button"
            key={a.label}
            className={`amenity-toggle ${has(a.label) ? 'selected' : ''}`}
            aria-pressed={has(a.label)}
            onClick={() => toggle(a.label)}
          >
            <Icon className="material-icons icon-16">{a.icon}</Icon> {a.label}
          </button>
        ))}
        {custom.map((label) => (
          <button type="button" key={label} className="amenity-toggle selected" aria-label={`Remove ${label}`} title="Click to remove" onClick={() => toggle(label)}>
            <Icon className="material-icons icon-16">star</Icon> {label} <Icon className="material-icons icon-14">close</Icon>
          </button>
        ))}
        {!adding && (
          <button type="button" className="amenity-toggle" style={{ borderStyle: 'dashed' }} onClick={() => setAdding(true)}>
            <Icon className="material-icons icon-16">add</Icon> Custom
          </button>
        )}
      </div>
      {adding && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="form-input"
            style={{ maxWidth: 280 }}
            autoFocus
            aria-label="Custom amenity name"
            placeholder="e.g. Rooftop garden"
            maxLength={MAX_CUSTOM_LENGTH + 10}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addCustom();
              }
              if (e.key === 'Escape') setAdding(false);
            }}
          />
          <button type="button" className="btn btn-primary btn-sm" onClick={addCustom}>
            Add
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => {
              setAdding(false);
              setText('');
              setError('');
            }}
          >
            Cancel
          </button>
          {error && (
            <span className="form-error" role="alert">
              {error}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
