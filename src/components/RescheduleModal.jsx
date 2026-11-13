import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { CalendarIcon, ClockIcon, CheckIcon, CheckCircleIcon } from './Icons';
import { useToast, useAuth } from '../context';
import { api } from '../api';

export default function RescheduleModal({
  isOpen = false,
  onClose,
  booking,
  userRole = 'learner', // 'mentor' | 'learner' | 'admin'
  onSuccess,
}) {
  const { user } = useAuth();
  const { toast } = useToast();

  const bookingId = booking?.id;
  const duration = Number(booking?.duration_minutes || booking?.duration || 60);
  const mentorId = booking?.mentor_id || (userRole === 'mentor' ? user?.id : null);
  const learnerName = booking?.learner_name || 'Learner';
  const mentorName = booking?.mentor_name || 'Mentor';
  const currentScheduledAt = booking?.scheduled_at || booking?.scheduled_time;

  // Available dates state
  const [availableDates, setAvailableDates] = useState([]);
  const [loadingDates, setLoadingDates] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');

  // Available slots state
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [dayAvailable, setDayAvailable] = useState(true);

  // Manual fallback state
  const [manualMode, setManualMode] = useState(false);
  const [manualDateTime, setManualDateTime] = useState('');

  // Form note & submit state
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Fetch available dates when modal opens
  const fetchAvailableDates = async () => {
    if (!mentorId) return;
    setLoadingDates(true);
    setError('');
    try {
      const res = await api.getAvailableDates(mentorId, duration, 21, bookingId);
      const dates = res?.available_dates || [];
      setAvailableDates(dates);
      if (dates.length > 0) {
        setSelectedDate(dates[0].date);
      } else {
        setSelectedDate('');
      }
    } catch (err) {
      console.error('Failed to load available dates for reschedule:', err);
      setAvailableDates([]);
    } finally {
      setLoadingDates(false);
    }
  };

  // Fetch slots whenever selectedDate or duration changes
  const fetchSlots = async (targetDate) => {
    const curDate = targetDate || selectedDate;
    if (!mentorId || !curDate) {
      setSlots([]);
      return;
    }
    setLoadingSlots(true);
    setError('');
    try {
      const res = await api.getAvailableSlots(mentorId, curDate, duration, bookingId);
      if (res) {
        const available = res.slots || [];
        setSlots(available);
        setDayAvailable(res.day_available !== false);
        // Retain selected slot if still valid
        setSelectedSlot((prev) => (prev ? available.find((s) => s.time === prev.time) || null : null));
      }
    } catch (err) {
      console.error('Failed to load slots for reschedule:', err);
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Reset and load when modal opens
  useEffect(() => {
    if (isOpen && booking) {
      setError('');
      setNote('');
      setSelectedSlot(null);
      setManualMode(false);
      setManualDateTime('');
      fetchAvailableDates();
    }
  }, [isOpen, bookingId, mentorId, duration]);

  // Load slots when selectedDate changes
  useEffect(() => {
    if (isOpen && mentorId && selectedDate) {
      fetchSlots(selectedDate);
    }
  }, [isOpen, mentorId, selectedDate, duration]);

  if (!isOpen || !booking) return null;

  const targetName = userRole === 'mentor' ? learnerName : mentorName;

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!bookingId) return;

    let targetIso = '';
    if (manualMode) {
      if (!manualDateTime) {
        setError('Please select a valid date and time.');
        return;
      }
      targetIso = manualDateTime;
    } else {
      if (!selectedSlot) {
        setError('Please choose an available time slot.');
        return;
      }
      targetIso = selectedSlot.iso;
    }

    setSubmitting(true);
    setError('');
    try {
      const res = await api.rescheduleBooking(bookingId, targetIso, note.trim());
      const formattedTime = new Date(targetIso).toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      toast.success(res?.message || `Session rescheduled to ${formattedTime}`);
      if (onSuccess) {
        onSuccess(res, targetIso);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Could not reschedule session. Please try another slot.');
      toast.error('Reschedule failed: ' + (err.message || 'Unknown error'));
      // If conflict, refresh dates and slots
      if (err.status === 409) {
        fetchAvailableDates();
        if (selectedDate) fetchSlots(selectedDate);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrentTime = (timeStr) => {
    if (!timeStr) return 'Unscheduled';
    const d = new Date(timeStr);
    return isNaN(d.getTime()) ? timeStr : d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={userRole === 'learner' ? `Reschedule Session with ${mentorName}` : 'Reschedule Session'}
      maxWidth="560px"
    >
      <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <p className="sub" style={{ margin: 0, fontSize: '13px', color: 'var(--ink-muted)' }}>
          Select a new date and time for your session with <strong>{targetName}</strong>.
        </p>

        {/* Current scheduled time card */}
        <div
          style={{
            padding: '10px 14px',
            background: 'var(--surface-hover, #f8fafc)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12.5px',
          }}
        >
          <div>
            <span style={{ color: 'var(--ink-muted)', display: 'block', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Current Scheduled Time
            </span>
            <strong style={{ color: 'var(--ink)' }}>{formatCurrentTime(currentScheduledAt)}</strong>
          </div>
          <span
            className="badge"
            style={{
              fontSize: '11.5px',
              padding: '3px 8px',
              background: 'rgba(99, 102, 241, 0.1)',
              color: 'var(--accent, #6366f1)',
              fontWeight: 600,
            }}
          >
            {duration} mins
          </span>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: 'var(--danger, #ef4444)',
              fontSize: '13px',
            }}
          >
            {error}
          </div>
        )}

        {/* Mode Switch: Slot Selector vs Manual */}
        {!manualMode ? (
          <>
            {/* 1. Select Date */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '13.5px', margin: 0 }}>
                  <CalendarIcon size={16} /> Select Date
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
                  <strong>No Open Calendar Openings Found</strong>
                  <div style={{ marginTop: '4px', fontSize: '12px' }}>
                    There are no scheduled slots found in the next 3 weeks for this {duration}-minute session.
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ marginTop: '8px', fontSize: '12px', color: 'var(--accent, #6366f1)', textDecoration: 'underline' }}
                    onClick={() => setManualMode(true)}
                  >
                    Switch to manual date/time picker
                  </button>
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
                          border: isSelected ? '1px solid var(--accent, #6366f1)' : '1px solid var(--border)',
                          background: isSelected ? 'var(--accent-soft, rgba(99, 102, 241, 0.12))' : 'var(--surface)',
                          color: isSelected ? 'var(--accent, #6366f1)' : 'var(--ink)',
                          flexShrink: 0,
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onClick={() => {
                          setSelectedDate(d.date);
                          setSelectedSlot(null);
                        }}
                      >
                        <span style={{ fontSize: '10.5px', textTransform: 'uppercase', fontWeight: 600 }}>
                          {d.day_name}
                        </span>
                        <span style={{ fontSize: '16px', fontWeight: 800, lineHeight: 1.2 }}>
                          {d.day_num}
                        </span>
                        <span style={{ fontSize: '10px', opacity: 0.75 }}>
                          {d.month_name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* 2. Select Time Slot */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '13.5px', margin: 0 }}>
                  <ClockIcon size={16} /> Available Time Slots
                </label>
                <span style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
                  Booked slots are automatically hidden
                </span>
              </div>

              {loadingSlots ? (
                <div style={{ padding: '20px', textAlign: 'center', background: 'var(--surface-hover, #f8fafc)', borderRadius: '8px' }}>
                  <div className="spinner-sm" style={{ margin: '0 auto 8px' }}></div>
                  <span className="mono" style={{ fontSize: '12px', color: 'var(--ink-muted)' }}>
                    Loading available openings...
                  </span>
                </div>
              ) : !selectedDate ? (
                <div
                  style={{
                    padding: '16px',
                    textAlign: 'center',
                    background: 'var(--surface-hover, #f8fafc)',
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
                    padding: '14px 16px',
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
                    All slots on this date are booked or have passed. Please select another day above.
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                    gap: '8px',
                    maxHeight: '160px',
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
                          border: isSelected ? '1px solid var(--accent, #6366f1)' : '1px solid var(--border)',
                          background: isSelected ? 'var(--accent, #6366f1)' : 'var(--surface)',
                          color: isSelected ? '#fff' : 'var(--ink)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                        onClick={() => setSelectedSlot(s)}
                      >
                        {s.start_formatted || s.time}
                        {isSelected && <CheckIcon size={13} />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Selected Slot Confirmation Badge */}
            {selectedSlot && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#059669',
                  fontSize: '13px',
                  fontWeight: 600,
                }}
              >
                <CheckCircleIcon size={16} />
                <span>
                  New Selected Time:{' '}
                  {new Date(selectedSlot.iso).toLocaleString([], {
                    dateStyle: 'full',
                    timeStyle: 'short',
                  })}
                </span>
              </div>
            )}

            {/* Manual Toggle Option */}
            <div style={{ textAlign: 'right', marginTop: '-4px' }}>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: '11.5px', padding: 0, color: 'var(--ink-muted)', textDecoration: 'underline' }}
                onClick={() => setManualMode(true)}
              >
                Need a specific custom time? Pick manually
              </button>
            </div>
          </>
        ) : (
          /* Manual Datetime Picker Fallback */
          <div className="field">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ margin: 0, fontWeight: 600 }}>New Date and Time</label>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: '11.5px', padding: 0, color: 'var(--accent, #6366f1)', textDecoration: 'underline' }}
                onClick={() => setManualMode(false)}
              >
                &larr; Back to available slots
              </button>
            </div>
            <input
              type="datetime-local"
              value={manualDateTime}
              onChange={(e) => setManualDateTime(e.target.value)}
              required={manualMode}
            />
          </div>
        )}

        {/* Note / Reason Field */}
        <div className="field" style={{ margin: 0 }}>
          <label style={{ fontWeight: 600, fontSize: '13px', marginBottom: '6px', display: 'block' }}>
            {userRole === 'mentor'
              ? 'Reason / Note for Learner (optional)'
              : userRole === 'learner'
              ? 'Reason / Note to Mentor (optional)'
              : 'Reason / Note (optional)'}
          </label>
          <textarea
            rows={2}
            placeholder={
              userRole === 'mentor'
                ? 'Let the learner know why this adjustment is requested...'
                : 'Let the mentor know why you need to reschedule...'
            }
            value={note}
            onChange={(e) => setNote(e.target.value)}
            style={{ width: '100%', resize: 'vertical' }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ flex: 1 }}
            onClick={onClose}
            disabled={submitting}
          >
            {userRole === 'mentor' ? 'Dismiss' : 'Cancel'}
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ flex: 1 }}
            disabled={submitting || (!manualMode && !selectedSlot) || (manualMode && !manualDateTime)}
          >
            {submitting ? (
              'Updating...'
            ) : userRole === 'mentor' || userRole === 'admin' ? (
              'Confirm Reschedule'
            ) : (
              'Send Reschedule Request'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
