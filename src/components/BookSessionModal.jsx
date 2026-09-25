import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context';
import { api } from '../api';
import Modal from './Modal';
import { ClockIcon, CalendarIcon, ShieldCheckIcon, StarIcon, CheckIcon } from './Icons';
import { initials } from '../utils';

const DURATION_OPTIONS = [
  { value: 30, label: '30 mins', badge: 'Quick Sync' },
  { value: 45, label: '45 mins', badge: 'Standard' },
  { value: 60, label: '60 mins', badge: 'Deep Dive' },
  { value: 90, label: '90 mins', badge: 'Intensive' },
  { value: 120, label: '120 mins', badge: 'Full Pair' },
];

const SESSION_FORMATS = [
  '1-on-1 Mentoring & Pair Programming',
  'Code Review & Architecture Feedback',
  'Live Bug Fixing & Debugging',
  'Mock Technical Interview',
];

export default function BookSessionModal({
  isOpen = false,
  onClose,
  mentor,
  onSuccess,
  initialDuration = 60,
  initialTopic = '',
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const mentorId = mentor ? (mentor.user_id || mentor.id) : null;
  const [liveMentor, setLiveMentor] = useState(mentor);

  useEffect(() => {
    setLiveMentor(mentor);
  }, [mentor]);

  useEffect(() => {
    if (isOpen && mentorId) {
      api.getMentor(mentorId)
        .then((data) => {
          if (data && data.hourly_rate !== undefined && data.hourly_rate !== null) {
            setLiveMentor((prev) => ({
              ...prev,
              ...data,
              hourly_rate: Number(data.hourly_rate),
            }));
          }
        })
        .catch(() => {});
    }
  }, [isOpen, mentorId]);

  const mentorName = liveMentor?.name || mentor?.name || 'Mentor';
  const mentorTitle = liveMentor?.title || mentor?.title || 'Technical Mentor';
  const hourlyRate = Number(
    liveMentor?.hourly_rate !== undefined && liveMentor?.hourly_rate !== null
      ? liveMentor.hourly_rate
      : mentor?.hourly_rate !== undefined && mentor?.hourly_rate !== null
      ? mentor.hourly_rate
      : 0
  );

  // Form State
  const [duration, setDuration] = useState(initialDuration || 60);
  const [sessionFormat, setSessionFormat] = useState(SESSION_FORMATS[0]);
  const [topic, setTopic] = useState(initialTopic || '');

  // Available dates dynamically loaded from backend (hiding any days mentor is not available)
  const [availableDates, setAvailableDates] = useState([]);
  const [loadingDates, setLoadingDates] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');

  const [selectedSlot, setSelectedSlot] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsMessage, setSlotsMessage] = useState('');
  const [dayAvailable, setDayAvailable] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Calculate dynamic price based on duration
  const calculatedPrice = useMemo(() => {
    if (!hourlyRate || hourlyRate <= 0) return 0;
    return Math.max(1, Math.round((hourlyRate * duration) / 60));
  }, [hourlyRate, duration]);

  // Load available dates (only days where mentor has scheduled open slots)
  const fetchAvailableDates = async (targetDuration) => {
    if (!mentorId) return;
    setLoadingDates(true);
    try {
      const dur = targetDuration || duration;
      const res = await api.getAvailableDates(mentorId, dur, 21);
      const dates = res?.available_dates || [];
      setAvailableDates(dates);
      setSelectedDate((prev) => {
        const stillValid = dates.some((d) => d.date === prev);
        return stillValid ? prev : (dates[0]?.date || '');
      });
    } catch (err) {
      console.error('Failed to load available dates:', err);
      setAvailableDates([]);
    } finally {
      setLoadingDates(false);
    }
  };

  // Load available slots for selectedDate and duration
  const fetchSlots = async (targetDate, targetDuration) => {
    const curDate = targetDate || selectedDate;
    const curDur = targetDuration || duration;
    if (!mentorId || !curDate) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    setError('');
    try {
      const res = await api.getAvailableSlots(mentorId, curDate, curDur);
      if (res) {
        const available = res.slots || [];
        setSlots(available);
        setDayAvailable(res.day_available !== false);
        setSlotsMessage(res.message || '');
        // Retain selected slot if it still exists in the newly fetched slots
        setSelectedSlot((prev) => (prev ? available.find((s) => s.time === prev.time) || null : null));
      }
    } catch (err) {
      console.error('Failed to load slots:', err);
      setSlots([]);
      setSlotsMessage('Could not retrieve available slots. Please try again.');
    } finally {
      setLoadingSlots(false);
    }
  };

  // When modal opens or mentor changes, reset and fetch available dates
  useEffect(() => {
    if (isOpen && mentorId) {
      setError('');
      setSelectedSlot(null);
      if (initialTopic) setTopic(initialTopic);
      const initDur = initialDuration || 60;
      setDuration(initDur);
      fetchAvailableDates(initDur);
    }
  }, [isOpen, mentorId]);

  // When duration changes while open, refresh available dates
  const handleDurationChange = (newDur) => {
    if (newDur === duration) return;
    setDuration(newDur);
    setSelectedSlot(null);
    fetchAvailableDates(newDur);
  };

  // When selectedDate or duration changes, fetch slots for that day
  useEffect(() => {
    if (isOpen && mentorId && selectedDate) {
      fetchSlots(selectedDate, duration);
    }
  }, [isOpen, mentorId, selectedDate, duration]);

  if (!isOpen || !mentor) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      const returnUrl = window.location.pathname + (window.location.search || `?bookMentor=${mentorId}`);
      try {
        sessionStorage.setItem('pairup_pending_action', JSON.stringify({
          action: 'book_session',
          mentorId,
          mentor,
          returnUrl,
        }));
      } catch (err) {}
      navigate(`/login?redirect=${encodeURIComponent(returnUrl)}`, {
        state: {
          from: { pathname: window.location.pathname, search: window.location.search || `?bookMentor=${mentorId}` },
          action: 'book_session',
          mentorId,
          mentor,
        },
      });
      return;
    }
    if (!selectedSlot) {
      setError('Please select an available time slot.');
      return;
    }
    if (!topic.trim()) {
      setError('Please enter what you need help with in this session.');
      return;
    }

    setSubmitting(true);
    setError('');

    const fullTopic = sessionFormat ? `[${sessionFormat}] ${topic.trim()}` : topic.trim();

    try {
      const bookingData = {
        mentor_id: mentorId,
        topic: fullTopic,
        duration_minutes: duration,
        price: calculatedPrice,
        hourly_rate: hourlyRate,
        scheduled_at: selectedSlot.iso,
      };

      const res = await api.createBooking(bookingData);
      toast.success(res?.message || 'Session requested successfully! Check My Sessions to track confirmation.');
      onClose();
      if (onSuccess) {
        onSuccess(res);
      } else {
        navigate('/learner/sessions');
      }
    } catch (err) {
      const errorMsg = err.message || 'Could not request session';
      setError(errorMsg);
      // If time conflict (409), refresh available dates & slots list immediately
      if (err.status === 409 || errorMsg.toLowerCase().includes('already booked')) {
        toast.error('This slot was already booked by another learner. Please select another slot.');
        fetchAvailableDates(duration);
        fetchSlots(selectedDate, duration);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Book Session with ${mentorName}`}
      subtitle={`${mentorTitle} · ₹${hourlyRate.toLocaleString('en-IN')}/hr`}
      maxWidth="680px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        {error && (
          <div className="error-box" style={{ margin: 0 }}>
            {error}
          </div>
        )}

        {/* Mentor Overview Card */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              className="avatar"
              style={{
                width: '44px',
                height: '44px',
                fontSize: '15px',
                background: 'linear-gradient(135deg, var(--accent), #8b5cf6)',
                color: '#fff',
                fontWeight: 700,
              }}
            >
              {initials(mentorName)}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px' }}>{mentorName}</div>
              <div className="sub" style={{ margin: 0, fontSize: '12.5px' }}>
                ₹{hourlyRate.toLocaleString('en-IN')} / hour rate · Escrow Protected
              </div>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '18px', fontWeight: 800, color: 'var(--accent)' }}>
              ₹{calculatedPrice.toLocaleString('en-IN')}
            </div>
            <div className="mono" style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
              for {duration} mins
            </div>
          </div>
        </div>

        {/* 1. Select Duration */}
        <div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '13.5px', marginBottom: '8px' }}>
            <ClockIcon size={16} /> 1. Select Session Duration
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(105px, 1fr))', gap: '8px' }}>
            {DURATION_OPTIONS.map((opt) => {
              const optPrice = Math.max(1, Math.round((hourlyRate * opt.value) / 60));
              const isSelected = duration === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  className={`btn ${isSelected ? 'btn-primary' : 'btn-ghost'}`}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '10px 6px',
                    borderRadius: '8px',
                    border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                    background: isSelected ? 'var(--accent-soft)' : 'var(--surface)',
                    color: isSelected ? 'var(--accent)' : 'var(--ink)',
                    transition: 'all 0.15s ease',
                  }}
                  onClick={() => handleDurationChange(opt.value)}
                >
                  <span style={{ fontWeight: 700, fontSize: '13px' }}>{opt.label}</span>
                  <span style={{ fontSize: '11px', opacity: 0.85, marginTop: '2px' }}>₹{optPrice.toLocaleString('en-IN')}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Select Date (Hiding any day mentor is not available) */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '13.5px', margin: 0 }}>
              <CalendarIcon size={16} /> 2. Select Date
            </label>
            <span style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
              Showing only available days
            </span>
          </div>

          {loadingDates ? (
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '6px' }}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  style={{
                    minWidth: '72px',
                    height: '62px',
                    borderRadius: '8px',
                    background: 'var(--surface-hover, #f3f4f6)',
                    opacity: 0.7,
                    flexShrink: 0,
                  }}
                />
              ))}
            </div>
          ) : availableDates.length === 0 ? (
            <div
              style={{
                padding: '14px 16px',
                textAlign: 'center',
                background: 'rgba(239, 68, 68, 0.06)',
                border: '1px dashed rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                fontSize: '13px',
                color: 'var(--ink-muted)',
              }}
            >
              <strong>No Available Days for this Duration</strong>
              <div style={{ marginTop: '4px', fontSize: '12px' }}>
                {mentor.name} has no scheduled openings for a {duration}-minute session in the next 3 weeks. Please select a shorter duration or message the mentor.
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'flex',
                gap: '8px',
                overflowX: 'auto',
                paddingBottom: '6px',
                scrollbarWidth: 'thin',
              }}
            >
              {availableDates.map((d) => {
                const isSelected = selectedDate === d.date;
                return (
                  <button
                    key={d.date}
                    type="button"
                    className={`btn ${isSelected ? 'btn-primary' : 'btn-ghost'}`}
                    style={{
                      minWidth: '72px',
                      padding: '8px 8px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      borderRadius: '8px',
                      border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                      background: isSelected ? 'var(--accent-soft)' : 'var(--surface)',
                      color: isSelected ? 'var(--accent)' : 'var(--ink)',
                      flexShrink: 0,
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onClick={() => {
                      setSelectedDate(d.date);
                      setSelectedSlot(null);
                    }}
                  >
                    <span style={{ fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 600 }}>{d.day_name}</span>
                    <span style={{ fontSize: '16px', fontWeight: 800, lineHeight: 1.2 }}>{d.day_num}</span>
                    <span style={{ fontSize: '10px', opacity: 0.75 }}>{d.month_name}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Select Time Slot (Hiding already booked slots) */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '13.5px', margin: 0 }}>
              <ClockIcon size={16} /> 3. Available Time Slots
            </label>
            <span style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
              Booked slots are automatically hidden
            </span>
          </div>

          {loadingSlots ? (
            <div style={{ padding: '24px', textAlign: 'center', background: 'var(--bg)', borderRadius: '8px' }}>
              <div className="spinner-sm" style={{ margin: '0 auto 8px' }}></div>
              <span className="mono" style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                Checking mentor availability &amp; removing booked slots...
              </span>
            </div>
          ) : !selectedDate ? (
            <div
              style={{
                padding: '16px',
                textAlign: 'center',
                background: 'var(--bg)',
                borderRadius: '8px',
                fontSize: '13px',
                color: 'var(--ink-muted)',
              }}
            >
              Please select an available date above to view open slots.
            </div>
          ) : !dayAvailable || slots.length === 0 ? (
            <div
              style={{
                padding: '16px',
                textAlign: 'center',
                background: 'rgba(234, 179, 8, 0.08)',
                border: '1px dashed rgba(234, 179, 8, 0.3)',
                borderRadius: '8px',
                fontSize: '13px',
                color: 'var(--ink-muted)',
              }}
            >
              <strong>All Slots Booked or Unavailable</strong>
              <div style={{ marginTop: '4px', fontSize: '12px' }}>
                All slots on this date are already booked by other learners, or the available time has passed. Please choose another date above.
              </div>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(115px, 1fr))',
                gap: '8px',
                maxHeight: '180px',
                overflowY: 'auto',
                padding: '4px 2px',
              }}
            >
              {slots.map((s) => {
                const isSelected = selectedSlot?.time === s.time;
                return (
                  <button
                    key={s.time}
                    type="button"
                    className={`btn ${isSelected ? 'btn-primary' : 'btn-ghost'}`}
                    style={{
                      padding: '8px 6px',
                      fontSize: '12.5px',
                      fontWeight: isSelected ? 700 : 500,
                      borderRadius: '6px',
                      border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                      background: isSelected ? 'var(--accent)' : 'var(--surface)',
                      color: isSelected ? '#fff' : 'var(--ink)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                    }}
                    onClick={() => {
                      setSelectedSlot(s);
                      setError('');
                    }}
                  >
                    {isSelected && <CheckIcon size={13} />}
                    <span>{s.start_formatted || s.time}</span>
                  </button>
                );
              })}
            </div>
          )}

          {selectedSlot && (
            <div
              style={{
                marginTop: '10px',
                padding: '8px 12px',
                background: 'var(--accent-soft)',
                border: '1px solid var(--accent)',
                borderRadius: '6px',
                fontSize: '12.5px',
                color: 'var(--accent)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <CheckIcon size={15} />
              <span>
                <strong>Selected Slot:</strong> {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {selectedSlot.label || selectedSlot.time} ({duration} mins)
              </span>
            </div>
          )}
        </div>

        {/* 4. Session Format & Topic */}
        <div className="field" style={{ margin: 0 }}>
          <label style={{ fontWeight: 600, fontSize: '13px' }}>Session Format</label>
          <select
            value={sessionFormat}
            onChange={(e) => setSessionFormat(e.target.value)}
            style={{ width: '100%' }}
          >
            {SESSION_FORMATS.map((fmt) => (
              <option key={fmt} value={fmt}>
                {fmt}
              </option>
            ))}
          </select>
        </div>

        <div className="field" style={{ margin: 0 }}>
          <label style={{ fontWeight: 600, fontSize: '13px' }}>What would you like to work on?</label>
          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Debugging a Django database query, reviewing React state architecture, or pairing on Docker deploy..."
            rows={3}
            required
            style={{ minHeight: '75px', resize: 'vertical' }}
          />
        </div>

        {/* Escrow Guarantee Box */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px 14px',
            background: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            fontSize: '12px',
            color: 'var(--ink-muted)',
          }}
        >
          <ShieldCheckIcon size={22} style={{ color: 'var(--accent)', flexShrink: 0 }} />
          <div>
            <strong style={{ color: 'var(--ink)' }}>100% Escrow Protected:</strong> Funds are held safely in platform escrow and only released after your session is completed to your satisfaction.
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            disabled={submitting}
            style={{ flex: 1 }}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting || !selectedSlot}
            style={{ flex: 2, fontWeight: 700 }}
          >
            {submitting ? 'Requesting Session...' : `Request Session (₹${calculatedPrice.toLocaleString('en-IN')})`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
