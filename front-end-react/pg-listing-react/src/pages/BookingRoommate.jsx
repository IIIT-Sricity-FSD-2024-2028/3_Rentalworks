import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RAW_ROOMMATES, RAW_LISTINGS } from '../data/listingsData';
import { useBooking } from '../context/BookingContext';
import { useAuth } from '../context/AuthContext';

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
  const {
    selectedPG,
    selectedRoom,
    selectedRoommate,
    setSelectedRoommate,
    guestLifestyleProfile,
    setGuestLifestyleProfile,
  } = useBooking();
  const { currentUser } = useAuth();

  const pg = selectedPG || RAW_LISTINGS.find(p => String(p.id) === String(id)) || RAW_LISTINGS[0];

  // CRITICAL: Single rooms have capacity 1 and NEVER match a roommate
  useEffect(() => {
    if (selectedRoom?.sharing === 'single' || selectedRoom?.capacity === 1) {
      setSelectedRoommate(null);
      navigate(`/book/${pg.id}/review`, { replace: true });
    }
  }, [selectedRoom, pg.id, navigate, setSelectedRoommate]);

  // Decision state: 'yes' (Smart Match) or 'no' (Auto-assign by warden)
  const [optInChoice, setOptInChoice] = useState('yes');

  // Guest criteria details form
  const [form, setForm] = useState({
    name: currentUser?.name || 'Guest Resident',
    age: 24,
    profession: 'Software Engineer',
    company: 'Infosys',
    sleepSchedule: 'Night Owl (12 AM - 8 AM)',
    cleanliness: 'High (Daily Cleanup)',
    foodHabit: 'Vegetarian',
    drinking: 'Non-Drinker',
    smoking: 'Non-Smoker',
    interests: ['Gaming', 'Coding', 'Reading'],
  });

  const [matchedRoommates, setMatchedRoommates] = useState([]);
  const [hasCalculated, setHasCalculated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Toggle interest chip
  const toggleInterest = (tag) => {
    setForm(prev => {
      const exists = prev.interests.includes(tag);
      return {
        ...prev,
        interests: exists
          ? prev.interests.filter(i => i !== tag)
          : [...prev.interests, tag]
      };
    });
  };

  // Local fallback compatibility scoring algorithm matching closeness
  const calculateLocalMatches = (profile, list) => {
    return list.map(rm => {
      let score = 50;

      // Sleep schedule closeness
      if (profile.sleepSchedule && rm.sleepHabit) {
        if (profile.sleepSchedule.toLowerCase() === rm.sleepHabit.toLowerCase()) {
          score += 20;
        } else if (
          profile.sleepSchedule.toLowerCase().includes('flexible') ||
          rm.sleepHabit.toLowerCase().includes('flexible')
        ) {
          score += 10;
        }
      }

      // Cleanliness
      if (profile.cleanliness && rm.cleanliness) {
        if (profile.cleanliness.toLowerCase() === rm.cleanliness.toLowerCase()) {
          score += 15;
        } else if (
          profile.cleanliness.toLowerCase().includes('moderate') ||
          rm.cleanliness.toLowerCase().includes('moderate')
        ) {
          score += 8;
        }
      }

      // Food habit
      if (profile.foodHabit && rm.foodHabit) {
        if (profile.foodHabit.toLowerCase() === rm.foodHabit.toLowerCase()) {
          score += 10;
        } else if (
          profile.foodHabit.toLowerCase().includes('flexible') ||
          rm.foodHabit.toLowerCase().includes('flexible')
        ) {
          score += 6;
        }
      }

      // Drinking & Smoking
      if (profile.drinking === 'Non-Drinker') score += 5;
      if (profile.smoking === 'Non-Smoker') score += 5;

      // Hobbies overlap
      const guestTags = profile.interests.map(t => t.toLowerCase());
      const rmTags = (rm.hobbies || []).map(t => t.toLowerCase());
      const common = guestTags.filter(t => rmTags.includes(t));
      score += Math.min(15, common.length * 5);

      // Company/Workplace closeness
      if (
        profile.company &&
        rm.company &&
        profile.company.toLowerCase() === rm.company.toLowerCase()
      ) {
        score += 5;
      }

      const matchPercentage = Math.min(98, Math.max(68, Math.round(score)));

      return {
        ...rm,
        matchPercentage,
        compatibility: matchPercentage,
        roomNum: rm.roomNum || rm.roomNumber || rm.room?.replace(/\D/g, '') || '101',
      };
    }).sort((a, b) => b.matchPercentage - a.matchPercentage);
  };

  const handleCalculateMatches = async () => {
    setIsLoading(true);
    const guestData = {
      ...form,
      propertyId: pg.id || 1,
      optedSmartMatch: true,
      userId: currentUser?.id || null,
    };

    setGuestLifestyleProfile(guestData);

    try {
      // 1. Save profile to backend table roommate_profiles
      fetch('http://localhost:3000/roommates/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guestData),
      }).catch(() => {});

      // 2. Fetch server-calculated matches in maximum match order
      const res = await fetch('http://localhost:3000/roommates/calculate-matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guestData),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const formatted = data.map(item => ({
            id: item.id,
            name: item.name,
            job: item.profession,
            profession: item.profession,
            age: item.age,
            company: item.company,
            room: item.roomNumber ? `Room ${item.roomNumber}` : 'Room 101',
            roomNum: item.roomNumber || '101',
            sharing: item.roomType || selectedRoom?.type || 'Double Sharing',
            sleepHabit: item.sleepSchedule,
            cleanliness: item.cleanliness,
            foodHabit: item.foodHabit,
            hobbies: Array.isArray(item.interests) ? item.interests : ['Gaming', 'Coding'],
            img: item.avatar || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500',
            matchPercentage: item.matchPercentage || item.compatibility || 90,
            compatibility: item.matchPercentage || item.compatibility || 90,
          }));
          setMatchedRoommates(formatted.sort((a, b) => b.matchPercentage - a.matchPercentage));
          setHasCalculated(true);
          setIsLoading(false);
          return;
        }
      }
    } catch (_) {}

    // Fallback to local calculation on RAW_ROOMMATES
    const localRanked = calculateLocalMatches(form, RAW_ROOMMATES);
    setMatchedRoommates(localRanked);
    setHasCalculated(true);
    setIsLoading(false);
  };

  const handleSelectRoommate = (rm) => {
    setSelectedRoommate(rm);
    navigate(`/book/${pg.id}/review`);
  };

  const handleOptOutAndProceed = () => {
    // Collect details, save to DB, but DO NOT show tenants straight away go to review/payment
    const guestData = {
      ...form,
      propertyId: pg.id || 1,
      optedSmartMatch: false,
      userId: currentUser?.id || null,
    };
    setGuestLifestyleProfile(guestData);

    fetch('http://localhost:3000/roommates/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(guestData),
    }).catch(() => {});

    setSelectedRoommate(null);
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
        {/* HEADER: Clean, without any 'Optional AI Match' tag */}
        <div className="step-intro-head">
          <h2>Smart Roommate Matching &amp; Lifestyle Preferences</h2>
          <p>
            You selected <strong>{selectedRoom?.type || 'Double Sharing'}</strong> at <strong>{pg.title}</strong>.
            Configure your living habits and compatibility preferences before proceeding to payment.
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
              <div className="decision-title">✨ Yes, Match Me with a Compatible Roommate</div>
              <div className="decision-desc">
                Select your lifestyle habits to calculate compatibility % against active residents in this PG and choose your preferred roommate.
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
              <div className="decision-title">⚡ No, Auto-Assign Roommate</div>
              <div className="decision-desc">
                Prefer warden auto-allocation. Save your living habits for PG records and skip tenant browsing directly to payment.
              </div>
            </div>
          </div>
        </div>

        {/* LIFESTYLE & CRITERIA FORM */}
        <div className="smart-form-container">
          <div className="smart-form-header">
            <h3>
              <span className="material-icons-outlined" style={{ color: '#ca8a04', fontSize: '20px' }}>tune</span>
              Your Lifestyle &amp; Compatibility Criteria
            </h3>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Used to calculate real-time compatibility %</span>
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
              <select
                value={form.sleepSchedule}
                onChange={(e) => setForm({ ...form, sleepSchedule: e.target.value })}
              >
                <option value="Night Owl (12 AM - 8 AM)">Night Owl (12 AM - 8 AM)</option>
                <option value="Early Riser (6 AM - 11 PM)">Early Riser (6 AM - 11 PM)</option>
                <option value="Flexible Schedule">Flexible Schedule</option>
              </select>
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

            <div className="roommate-cards-grid">
              {matchedRoommates.map((rm) => {
                const isSelected = selectedRoommate?.id === rm.id;
                const matchVal = rm.matchPercentage || rm.compatibility || 90;
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
                      {isSelected ? '✓ Selected Roommate' : 'Choose as Roommate →'}
                    </button>
                  </div>
                );
              })}
            </div>
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
