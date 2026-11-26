import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { selectCurrentUser } from '../features/auth/authSlice';
import {
  calculateRoommateMatches,
  checkGenderEligibility,
  isSingleRoom,
  saveLifestyleProfile,
  selectMatches,
  selectRoommate,
  selectSelectedPG,
  selectSelectedRoom,
  selectSelectedRoommate,
} from '../features/booking/bookingSlice';
import { toastError } from '../features/ui/uiSlice';

const PROFILE_FIELDS = ['name', 'age', 'profession', 'company', 'sleepSchedule', 'cleanliness', 'foodHabit', 'drinking', 'smoking', 'interests'];
const pickProfile = (p) => Object.fromEntries(PROFILE_FIELDS.filter((k) => p[k] !== undefined && p[k] !== null).map((k) => [k, p[k]]));

const SLEEP_OPTIONS = ['Night Owl', 'Early Riser', 'Flexible'];


const AVAILABLE_INTERESTS = [
  'Gaming',
  'Coding',
  'Reading',
  'Music',
  'Fitness',
  'Gym',
  'Chess',
  'Badminton',
  'Coffee',
  'Cooking',
  'Travel'
];

export default function BookingRoommate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const currentUser = useSelector(selectCurrentUser);
  const pg = useSelector(selectSelectedPG);
  const selectedRoom = useSelector(selectSelectedRoom);
  const selectedRoommate = useSelector(selectSelectedRoommate);
  const savedProfile = useSelector((s) => s.booking.lifestyleProfile);
  const { items: matchedRoommates, status: matchStatus, error: matchError } = useSelector(selectMatches);
  const isLoading = matchStatus === 'loading';
  const hasCalculated = matchStatus === 'succeeded' || matchStatus === 'failed';

  // Guard: the flow needs a selected PG + room (e.g. after a hard refresh in a new tab).
  const invalid = !pg || !selectedRoom || String(pg.id) !== String(id);
  useEffect(() => {
    if (invalid) navigate(`/pg/${id}`, { replace: true });
    else if (isSingleRoom(selectedRoom)) navigate(`/book/${pg.id}/review`, { replace: true });
  }, [invalid, selectedRoom, pg, id, navigate]);

  // Gender policy guard (users can deep-link here).
  useEffect(() => {
    if (!pg || !currentUser) return;
    const eligibility = checkGenderEligibility(pg, currentUser);
    if (!eligibility.ok && !eligibility.needsGender) {
      dispatch(toastError(eligibility.message));
      navigate(`/pg/${pg.id}`, { replace: true });
    }
  }, [pg, currentUser, navigate, dispatch]);

  // 'yes' = smart match, 'no' = warden auto-assigns
  const [optInChoice, setOptInChoice] = useState(savedProfile?.optedSmartMatch === false ? 'no' : 'yes');

  const [form, setForm] = useState(() => ({
    name: currentUser?.name || '',
    age: 24,
    profession: '',
    company: '',
    sleepSchedule: 'Night Owl',
    cleanliness: 'High (Daily Cleanup)',
    foodHabit: 'Vegetarian',
    drinking: 'Non-Drinker',
    smoking: 'Non-Smoker',
    interests: ['Reading'],
    ...(savedProfile ? pickProfile(savedProfile) : {}),
  }));

  const [customHobby, setCustomHobby] = useState('');
  const [customHobbies, setCustomHobbies] = useState(() =>
    (savedProfile?.interests || []).filter((h) => !AVAILABLE_INTERESTS.includes(h)),
  );

  if (invalid || isSingleRoom(selectedRoom)) return null;

  const addCustomHobby = () => {
    const clean = customHobby.trim().replace(/\s+/g, ' ').slice(0, 24);
    if (!clean) return;
    const all = [...AVAILABLE_INTERESTS, ...customHobbies];
    const existing = all.find((h) => h.toLowerCase() === clean.toLowerCase());
    if (!existing) setCustomHobbies((prev) => [...prev, clean]);
    const tag = existing || clean;
    setForm((prev) => (prev.interests.includes(tag) ? prev : { ...prev, interests: [...prev.interests, tag] }));
    setCustomHobby('');
  };

  const removeCustomHobby = (tag) => {
    setCustomHobbies((prev) => prev.filter((h) => h !== tag));
    setForm((prev) => ({ ...prev, interests: prev.interests.filter((i) => i !== tag) }));
  };

  const toggleInterest = (tag) => {
    setForm((prev) => ({
      ...prev,
      interests: prev.interests.includes(tag) ? prev.interests.filter((i) => i !== tag) : [...prev.interests, tag],
    }));
  };

  const buildProfile = (optedSmartMatch) => ({
    ...form,
    age: Number(form.age) || undefined,
    propertyId: pg.id,
    optedSmartMatch,
    userId: currentUser?.id || null,
    roomId: selectedRoom.id || null,
    roomNumber: selectedRoom.roomNumber || null,
    roomType: selectedRoom.type,
    sharingType: selectedRoom.sharing,
    capacity: selectedRoom.capacity,
  });

  const validate = () => {
    if (!form.name.trim()) return 'Please enter your name.';
    if (!form.profession.trim()) return 'Please enter your profession (e.g. Student, Software Engineer).';
    return null;
  };

  const handleCalculateMatches = () => {
    const problem = validate();
    if (problem) {
      dispatch(toastError(problem));
      return;
    }
    dispatch(selectRoommate(null));
    dispatch(calculateRoommateMatches(buildProfile(true)));
  };

  const handleSelectRoommate = (rm) => {
    dispatch(selectRoommate(rm));
    navigate(`/book/${pg.id}/review`);
  };

  const handleOptOutAndProceed = () => {
    dispatch(saveLifestyleProfile(buildProfile(false)));
    dispatch(selectRoommate(null));
    navigate(`/book/${pg.id}/review`);
  };

  return (
    <div className="booking-step-container">
      {/* STEPPER HEADER */}
      <div className="booking-stepper-header">
        <div className="stepper-track">
          <div className="step-node active">
            <span className="step-num">1</span>
            <span className="step-label">Roommate Match</span>
          </div>
          <div className="step-line" />
          <div className="step-node">
            <span className="step-num">2</span>
            <span className="step-label">Review Details</span>
          </div>
          <div className="step-line" />
          <div className="step-node">
            <span className="step-num">3</span>
            <span className="step-label">Payment</span>
          </div>
          <div className="step-line" />
          <div className="step-node">
            <span className="step-num">4</span>
            <span className="step-label">Confirmed</span>
          </div>
        </div>
      </div>

      <div className="booking-step-card">
        <div className="step-intro-head">
          <h2>Choose a roommate</h2>
          <p>
            You selected <strong>{selectedRoom?.type || 'Double Sharing'}</strong> at <strong>{pg.title}</strong>.
            Tell us your habits to see how well you'd match with people already staying here, or let the warden assign a bed.
          </p>
        </div>

        {/* WORKFLOW DECISION: OPT-IN OR OPT-OUT */}
        <div className="smart-match-decision-grid">
          <div
            className={`decision-card ${optInChoice === 'yes' ? 'active' : ''}`}
            onClick={() => setOptInChoice('yes')}
          >
            <div className="decision-radio">
              {optInChoice === 'yes' && <div className="decision-radio-dot" />}
            </div>
            <div>
              <div className="decision-title">Show me possible roommates</div>
              <div className="decision-desc">
                Fill in your habits below. We compare them with current residents and show a match percentage for each.
              </div>
            </div>
          </div>

          <div
            className={`decision-card ${optInChoice === 'no' ? 'active' : ''}`}
            onClick={() => setOptInChoice('no')}
          >
            <div className="decision-radio">
              {optInChoice === 'no' && <div className="decision-radio-dot" />}
            </div>
            <div>
              <div className="decision-title">Skip, assign me any free bed</div>
              <div className="decision-desc">
                Your habits are still saved for the warden. You go straight to payment.
              </div>
            </div>
          </div>
        </div>

        {/* LIFESTYLE & CRITERIA FORM */}
        <div className="smart-form-container">
          <div className="smart-form-header">
            <h3>
              <span className="material-icons-outlined" style={{ color: '#ca8a04', fontSize: '20px' }}>tune</span>
              Your habits
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Used to work out the match percentage</span>
          </div>

          <div className="smart-form-grid">
            {/* Full Name */}
            <div className="smart-input-group">
              <label>Full Name *</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Arun Kumar"
              />
            </div>

            {/* Age */}
            <div className="smart-input-group">
              <label>Age *</label>
              <input
                type="number"
                min="18"
                max="65"
                value={form.age}
                onChange={(e) => setForm({ ...form, age: e.target.value })}
                placeholder="e.g. 24"
              />
            </div>

            {/* Profession */}
            <div className="smart-input-group">
              <label>Profession / Job *</label>
              <input
                type="text"
                value={form.profession}
                onChange={(e) => setForm({ ...form, profession: e.target.value })}
                placeholder="e.g. Software Engineer, Designer, Student"
              />
            </div>

            {/* Workplace / Company */}
            <div className="smart-input-group">
              <label>Workplace / Company ("Where Working") *</label>
              <input
                type="text"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                placeholder="e.g. Infosys, TCS, Swiggy, University"
              />
            </div>

            {/* Sleep Schedule */}
            <div className="smart-input-group">
              <label>Sleep Schedule *</label>
              <div className="sleep-pill-group" role="radiogroup" aria-label="Sleep schedule">
                {SLEEP_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    role="radio"
                    aria-checked={form.sleepSchedule === opt}
                    className={`smart-chip-btn ${form.sleepSchedule === opt ? 'active' : ''}`}
                    onClick={() => setForm({ ...form, sleepSchedule: opt })}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

            {/* Cleanliness */}
            <div className="smart-input-group">
              <label>Cleanliness Standard *</label>
              <select
                value={form.cleanliness}
                onChange={(e) => setForm({ ...form, cleanliness: e.target.value })}
              >
                <option value="High (Daily Cleanup)">High (Daily Cleanup)</option>
                <option value="Moderate & Organized">Moderate &amp; Organized</option>
                <option value="Basic / Relaxed">Basic / Relaxed</option>
              </select>
            </div>

            {/* Food Habits */}
            <div className="smart-input-group">
              <label>Food Habits *</label>
              <select
                value={form.foodHabit}
                onChange={(e) => setForm({ ...form, foodHabit: e.target.value })}
              >
                <option value="Vegetarian">Vegetarian</option>
                <option value="Eggetarian / Non-Veg">Eggetarian / Non-Veg</option>
                <option value="Non-Vegetarian">Non-Vegetarian</option>
                <option value="Flexible Diet">Flexible Diet</option>
              </select>
            </div>

            {/* Drinking Habits */}
            <div className="smart-input-group">
              <label>Drinking Habits *</label>
              <select
                value={form.drinking}
                onChange={(e) => setForm({ ...form, drinking: e.target.value })}
              >
                <option value="Non-Drinker">Non-Drinker</option>
                <option value="Occasional Drinker">Occasional Drinker</option>
                <option value="Regular">Regular</option>
              </select>
            </div>

            {/* Smoking Habits */}
            <div className="smart-input-group">
              <label>Smoking Habits *</label>
              <select
                value={form.smoking}
                onChange={(e) => setForm({ ...form, smoking: e.target.value })}
              >
                <option value="Non-Smoker">Non-Smoker</option>
                <option value="Occasional Smoker">Occasional Smoker</option>
                <option value="Smoker">Smoker</option>
              </select>
            </div>
          </div>

          {/* Interests & Hobbies Chips */}
          <div className="smart-hobbies-section">
            <label>Interests &amp; Hobbies (Select all that apply)</label>
            <div className="smart-chips-wrapper">
              {AVAILABLE_INTERESTS.map((tag) => {
                const isSelected = form.interests.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    className={`smart-chip-btn ${isSelected ? 'active' : ''}`}
                    onClick={() => toggleInterest(tag)}
                  >
                    #{tag}
                  </button>
                );
              })}
              {customHobbies.map((tag) => {
                const isSelected = form.interests.includes(tag);
                return (
                  <span key={`c-${tag}`} className={`smart-chip-btn ${isSelected ? 'active' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <button type="button" onClick={() => toggleInterest(tag)} style={{ background: 'none', border: 0, color: 'inherit', cursor: 'pointer', padding: 0, font: 'inherit' }}>
                      #{tag}
                    </button>
                    <button type="button" aria-label={`Remove ${tag}`} onClick={() => removeCustomHobby(tag)} style={{ background: 'none', border: 0, color: 'inherit', cursor: 'pointer', padding: 0, font: 'inherit' }}>×</button>
                  </span>
                );
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input
                type="text"
                value={customHobby}
                maxLength={24}
                placeholder="Add your own hobby…"
                onChange={(e) => setCustomHobby(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustomHobby(); } }}
                style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #cbd5e1' }}
              />
              <button type="button" className="smart-chip-btn active" onClick={addCustomHobby}>[ + Add ]</button>
            </div>
          </div>

          {/* Action Trigger inside Form */}
          {optInChoice === 'yes' ? (
            <button
              type="button"
              className="btn-calculate-matches"
              onClick={handleCalculateMatches}
              disabled={isLoading}
            >
              <span className="material-icons-outlined" style={{ fontSize: '20px' }}>sync_alt</span>
              {isLoading ? 'Calculating Compatibility Scores...' : 'Calculate Compatibility & Show Ranked Roommates →'}
            </button>
          ) : (
            <button
              type="button"
              className="btn-calculate-matches"
              onClick={handleOptOutAndProceed}
              style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
            >
              <span className="material-icons-outlined" style={{ fontSize: '20px' }}>check_circle</span>
              Save Preferences &amp; Proceed Directly to Payment (Auto-Assign) →
            </button>
          )}
        </div>

        {/* MATCHED ROOMMATES SECTION: Displayed in Maximum Match Order if Opted In */}
        {optInChoice === 'yes' && hasCalculated && (
          <div className="matches-results-container">
            <div className="matches-section-title">
              <h3>
                <span className="material-icons-outlined" style={{ color: '#ca8a04', fontSize: '22px' }}>groups</span>
                Available Roommates (Ranked by Compatibility)
              </h3>
              <span className="matches-order-pill">⚡ Sorted in Maximum Match Order</span>
            </div>

            {matchedRoommates.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <p style={{ color: matchError ? '#b91c1c' : '#64748b', fontSize: '15px', margin: 0 }}>
                  {matchError
                    ? `We couldn't calculate matches right now (${matchError}).`
                    : `No compatible roommates currently found for ${selectedRoom?.type || 'this room sharing type'}.`}
                </p>
                <p style={{ color: '#94a3b8', fontSize: '13px', marginTop: '6px' }}>
                  You can proceed with auto-assignment and the warden will allocate a matching roommate upon check-in.
                </p>
              </div>
            ) : (
              <div className="roommate-cards-grid">
                {matchedRoommates.map((rm) => {
                  const isSelected = selectedRoommate?.id === rm.id;
                  const matchVal = rm.matchPercentage || 0;
                  const badgeBg = matchVal >= 90 ? '#dcfce7' : matchVal >= 80 ? '#e0f2fe' : '#fef3c7';
                  const badgeColor = matchVal >= 90 ? '#15803d' : matchVal >= 80 ? '#0369a1' : '#b45309';

                  return (
                    <div key={rm.id} className={`roommate-profile-card ${isSelected ? 'selected' : ''}`}>
                      <div className="rm-card-top">
                        <img src={rm.img || rm.avatar} alt={rm.name} className="rm-avatar" />
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong className="rm-name">{rm.name}</strong>
                            <span
                              className="compatibility-badge"
                              style={{ background: badgeBg, color: badgeColor }}
                            >
                              ⚡ {matchVal}% Match
                            </span>
                          </div>
                          <p className="rm-job">{rm.job || rm.profession} • {rm.age} yrs • {rm.company}</p>
                          <span className="rm-room-chip">{rm.room} ({rm.sharing})</span>
                        </div>
                      </div>

                      <div className="rm-habits-list">
                        <div className="habit-row">
                          <span className="habit-label">Sleep Schedule:</span>
                          <span className="habit-val">{rm.sleepHabit}</span>
                        </div>
                        <div className="habit-row">
                          <span className="habit-label">Cleanliness:</span>
                          <span className="habit-val">{rm.cleanliness}</span>
                        </div>
                        <div className="habit-row">
                          <span className="habit-label">Food Habit:</span>
                          <span className="habit-val">{rm.foodHabit}</span>
                        </div>
                      </div>

                      <div className="rm-hobbies-chips">
                        {(rm.hobbies || []).map((h, i) => (
                          <span key={i} className="hobby-chip">#{h}</span>
                        ))}
                      </div>

                      <button
                        className={`btn-select-rm ${isSelected ? 'btn-selected' : ''}`}
                        onClick={() => handleSelectRoommate(rm)}
                      >
                        {isSelected ? 'Selected' : 'Choose'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* BOTTOM NAV BUTTONS */}
        <div className="step-bottom-actions">
          <button className="btn-back-step" onClick={() => navigate(`/pg/${pg.id}`)}>
            ← Back to Room Details
          </button>
          <button className="btn-skip-step" onClick={handleOptOutAndProceed}>
            Skip Matching &amp; Auto-Assign →
          </button>
        </div>
      </div>
    </div>
  );
}
