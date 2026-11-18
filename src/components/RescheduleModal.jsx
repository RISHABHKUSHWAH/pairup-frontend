import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { CalendarIcon, ClockIcon, CheckIcon, CheckCircleIcon } from './Icons';
import { useToast, useAuth } from '../context';
import { api } from '../api';
import { mentorNotifications, learnerNotifications } from '../api/storage';

export default function RescheduleModal({
  isOpen = false,
  onClose,
  booking,
  userRole = 'learner', // 'mentor' | 'learner' | 'admin'
  onSuccess,
  title: customTitle,
  mode, // 'schedule' | 'reschedule' | undefined
  contractId,
  onSchedule,
}) {
  const { user } = useAuth();
  const { toast } = useToast();

  const bookingId = booking?.id;
  const duration = Number(booking?.duration_minutes || booking?.duration || 60);
  const mentorId = booking?.mentor_id || (userRole === 'mentor' ? user?.id : null);
  const learnerName = booking?.learner_name || 'Learner';
  const mentorName = booking?.mentor_name || 'Mentor';
  const currentScheduledAt = booking?.scheduled_at || booking?.scheduled_time;
  const hasValidSchedule = Boolean(
    currentScheduledAt &&
    !isNaN(new Date(currentScheduledAt).getTime()) &&
    currentScheduledAt !== 'Not scheduled yet' &&
    currentScheduledAt !== 'unscheduled'
  );
  const isScheduleMode = mode === 'schedule' || (!mode && !hasValidSchedule);
  const effectiveContractId = contractId || booking?.contract_id;
  const targetName = userRole === 'mentor' ? learnerName : mentorName;
  const effectiveRole = userRole || (user?.role === 'mentor' || user?.id === booking?.mentor_id ? 'mentor' : 'learner');
  const isMentorOrAdmin =
    effectiveRole === 'mentor' ||
    effectiveRole === 'admin' ||
    user?.role === 'mentor' ||
    user?.role === 'admin' ||
    user?.role === 'superadmin' ||
    user?.id === booking?.mentor_id;

  let modalTitle = customTitle;
  if (!modalTitle) {
    const rawTopic = (booking?.topic || '').trim();
    // Strip duplicate prefix like "Session 1: " from topic if already present
    const cleanTopic = rawTopic.replace(/^session\s*\d*:\s*/i, '').trim() || rawTopic || 'Milestone Session';
    const sessionPrefix = booking?.session_number ? `Session ${booking.session_number}: ` : '';

    if (isScheduleMode) {
      modalTitle = `Schedule ${sessionPrefix}${cleanTopic}`;
    } else {
      modalTitle = `Reschedule ${sessionPrefix}${cleanTopic}`;
    }
  }

  // Available dates state
  const [availableDates, setAvailableDates] = useState([]);
  const [loadingDates, setLoadingDates] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');

  // Available slots state
  const [slots, setSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [dayAvailable, setDayAvailable] = useState(true);

  // Manual Date, Time Dialer & AM/PM State
  const [manualMode, setManualMode] = useState(false);
  const [manualDate, setManualDate] = useState('');
  const [manualHour, setManualHour] = useState('07');
  const [manualMinute, setManualMinute] = useState('00');
  const [manualPeriod, setManualPeriod] = useState('PM');
  const [manualDateTime, setManualDateTime] = useState('');

  // Form note & submit state
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const computeIso = (d, h, m, p) => {
    if (!d) return '';
    const hNum = parseInt(h, 10) || 12;
    const hour24 = p === 'PM' ? (hNum === 12 ? 12 : hNum + 12) : (hNum === 12 ? 0 : hNum);
    const hh = String(hour24).padStart(2, '0');
    const mm = String(m || '00').padStart(2, '0');
    return `${d}T${hh}:${mm}:00`;
  };

  const handleManualDateChange = (val) => {
    setManualDate(val);
    setManualDateTime(computeIso(val, manualHour, manualMinute, manualPeriod));
  };

  const handleHourChange = (val) => {
    setManualHour(val);
    setManualDateTime(computeIso(manualDate, val, manualMinute, manualPeriod));
  };

  const handleMinuteChange = (val) => {
    setManualMinute(val);
    setManualDateTime(computeIso(manualDate, manualHour, val, manualPeriod));
  };

  const handlePeriodChange = (val) => {
    setManualPeriod(val);
    setManualDateTime(computeIso(manualDate, manualHour, manualMinute, val));
  };

  const applyPreset = (h, m, p) => {
    setManualHour(h);
    setManualMinute(m);
    setManualPeriod(p);
    setManualDateTime(computeIso(manualDate, h, m, p));
  };

  const formatManualPreview = (d, h, m, p) => {
    if (!d) return '';
    try {
      const parts = d.split('-');
      const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const dayStr = dateObj.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
      return `${dayStr} at ${h}:${m} ${p}`;
    } catch {
      return `${d} at ${h}:${m} ${p}`;
    }
  };

  // Fetch available dates when modal opens
  const fetchAvailableDates = async () => {
    if (!mentorId) return;
    setLoadingDates(true);
    setError('');
    try {
      const res = await api.getAvailableDates(mentorId, duration, 21, bookingId);
      const dates = res?.available_dates || [];
      setAvailableDates(dates);
      const currentDateStr = currentScheduledAt ? currentScheduledAt.slice(0, 10) : '';
      const matched = dates.find((d) => d.date === currentDateStr);
      if (matched) {
        setSelectedDate(matched.date);
      } else if (dates.length > 0) {
        setSelectedDate(dates[0].date);
      } else {
        setSelectedDate('');
      }
    } catch (err) {
      console.error('Failed to load available dates:', err);
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

      if (currentScheduledAt) {
        const d = new Date(currentScheduledAt);
        if (!isNaN(d.getTime())) {
          const dateStr = currentScheduledAt.slice(0, 10);
          setManualDate(dateStr);
          const h24 = d.getHours();
          const p = h24 >= 12 ? 'PM' : 'AM';
          let h12 = h24 % 12;
          if (h12 === 0) h12 = 12;
          const hStr = String(h12).padStart(2, '0');
          const mStr = String(d.getMinutes()).padStart(2, '0');
          setManualHour(hStr);
          setManualMinute(mStr);
          setManualPeriod(p);
          setManualDateTime(currentScheduledAt.slice(0, 19));
        }
      } else {
        const nextDay = new Date();
        nextDay.setDate(nextDay.getDate() + 1);
        const nextDayStr = nextDay.toISOString().split('T')[0];
        setManualDate(nextDayStr);
        setManualHour('07');
        setManualMinute('00');
        setManualPeriod('PM');
        setManualDateTime(`${nextDayStr}T19:00:00`);
      }

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

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!bookingId) return;

    let targetIso = '';
    if (manualMode && isMentorOrAdmin) {
      targetIso = manualDateTime || computeIso(manualDate, manualHour, manualMinute, manualPeriod);
      if (!targetIso || !manualDate) {
        setError('Please select a valid date and time.');
        return;
      }
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
      let res;
      if (onSchedule) {
        res = await onSchedule(bookingId, targetIso, note.trim());
      } else if (effectiveContractId) {
        res = await api.scheduleContractSession(effectiveContractId, bookingId, targetIso, note.trim());
      } else {
        res = await api.rescheduleBooking(bookingId, targetIso, note.trim());
      }

      const formattedTime = new Date(targetIso).toLocaleString([], {
        dateStyle: 'medium',
        timeStyle: 'short',
      });
      const actionVerb = isScheduleMode ? 'scheduled' : 'rescheduled';
      toast.success(res?.message || `Session ${actionVerb} for ${formattedTime}`);

      // Dispatch pairup_notifications_updated immediately
      window.dispatchEvent(new CustomEvent('pairup_notifications_updated'));

      // Browser desktop notification
      if (typeof window !== 'undefined' && 'Notification' in window) {
        const notifTitle = isScheduleMode ? 'Session Scheduled 📅' : 'Session Rescheduled 📅';
        if (Notification.permission === 'granted') {
          try {
            new Notification(notifTitle, {
              body: `Session with ${targetName} scheduled for ${formattedTime}`,
              icon: '/favicon.ico',
            });
          } catch (_) {}
        } else if (Notification.permission === 'default') {
          Notification.requestPermission().then((perm) => {
            if (perm === 'granted') {
              try {
                new Notification(notifTitle, {
                  body: `Session with ${targetName} scheduled for ${formattedTime}`,
                  icon: '/favicon.ico',
                });
              } catch (_) {}
            }
          }).catch(() => {});
        }
      }

      // Add to local notification storage as offline/instant backup
      try {
        if (userRole === 'mentor') {
          mentorNotifications.addNotification({
            type: 'session',
            title: isScheduleMode ? 'Session Scheduled 📅' : 'Session Rescheduled 📅',
            body: `You ${actionVerb} session '${booking?.topic || 'Session'}' with ${learnerName} for ${formattedTime}.`,
            link: effectiveContractId ? `/contract/${effectiveContractId}` : '/mentor/sessions',
          });
        } else if (userRole === 'learner') {
          learnerNotifications.addNotification({
            type: 'session',
            title: isScheduleMode ? 'Session Scheduled 📅' : (effectiveContractId ? 'Session Rescheduled 📅' : 'Reschedule Request Sent 📅'),
            body: `Session '${booking?.topic || 'Session'}' with ${mentorName} was ${actionVerb} for ${formattedTime}.`,
            link: effectiveContractId ? `/contract/${effectiveContractId}` : '/learner/sessions',
          });
        }
      } catch (_) {}

      window.dispatchEvent(new CustomEvent('pairup_notifications_updated'));

      if (onSuccess) {
        onSuccess(res, targetIso);
      }
      onClose();
    } catch (err) {
      setError(err.message || `Could not ${isScheduleMode ? 'schedule' : 'reschedule'} session. Please try another slot.`);
      toast.error((isScheduleMode ? 'Schedule' : 'Reschedule') + ' failed: ' + (err.message || 'Unknown error'));
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
    if (!timeStr || !hasValidSchedule) return 'Not scheduled yet';
    const d = new Date(timeStr);
    return isNaN(d.getTime()) ? 'Not scheduled yet' : d.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      maxWidth="560px"
    >
      <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <p className="sub" style={{ margin: 0, fontSize: '13px', color: 'var(--ink-muted)' }}>
          {isScheduleMode
            ? <>Select a date and time for your session with <strong>{targetName}</strong>.</>
            : <>Select a new date and time for your session with <strong>{targetName}</strong>.</>}
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
              {currentScheduledAt ? 'Current Scheduled Time' : 'Current Status'}
            </span>
            <strong style={{ color: currentScheduledAt ? 'var(--ink)' : 'var(--warn, #f59e0b)' }}>
              {formatCurrentTime(currentScheduledAt)}
            </strong>
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
                    {isMentorOrAdmin
                      ? `There are no scheduled slots found in the next 3 weeks for this ${duration}-minute session.`
                      : `Your mentor has no open slots in the next 3 weeks. Please message them to open availability.`}
                  </div>
                  {isMentorOrAdmin && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ marginTop: '8px', fontSize: '12px', color: 'var(--accent, #6366f1)', textDecoration: 'underline' }}
                      onClick={() => setManualMode(true)}
                    >
                      Switch to manual date/time picker
                    </button>
                  )}
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

            {/* Manual Toggle Option - ONLY AVAILABLE FOR MENTOR / ADMIN */}
            {isMentorOrAdmin && (
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
            )}
          </>
        ) : (
          /* Interactive Calendar & Time Dialer with AM and PM */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              padding: '14px',
              background: 'var(--surface-hover, #1e1e2d)',
              border: '1px solid var(--border)',
              borderRadius: '10px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ margin: 0, fontWeight: 700, fontSize: '13.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <CalendarIcon size={16} /> Select Date &amp; Time
              </label>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ fontSize: '11.5px', padding: '2px 8px', color: 'var(--accent, #6366f1)', textDecoration: 'underline' }}
                onClick={() => setManualMode(false)}
              >
                &larr; Back to available slots
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
              {/* Calendar Date Picker Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-muted)' }}>
                  📅 Calendar Date
                </span>
                <input
                  type="date"
                  value={manualDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => handleManualDateChange(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    background: 'var(--card-bg, #12121a)',
                    color: 'var(--ink, #fff)',
                    fontSize: '13.5px',
                    fontWeight: 600,
                  }}
                  required
                />
              </div>

              {/* Time Dialer & AM / PM Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--ink-muted)' }}>
                  ⏰ Time Dialer (AM / PM)
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {/* Hour Dropdown / Dialer */}
                  <select
                    value={manualHour}
                    onChange={(e) => handleHourChange(e.target.value)}
                    style={{
                      flex: 1,
                      minWidth: '55px',
                      padding: '9px 6px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--card-bg, #12121a)',
                      color: 'var(--ink, #fff)',
                      fontSize: '14px',
                      fontWeight: 700,
                      textAlign: 'center',
                    }}
                    title="Select hour (1-12)"
                  >
                    {['01','02','03','04','05','06','07','08','09','10','11','12'].map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>

                  <span style={{ fontWeight: 800, fontSize: '16px', color: 'var(--ink-muted)' }}>:</span>

                  {/* Minute Dropdown / Dialer */}
                  <select
                    value={manualMinute}
                    onChange={(e) => handleMinuteChange(e.target.value)}
                    style={{
                      flex: 1,
                      minWidth: '55px',
                      padding: '9px 6px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--card-bg, #12121a)',
                      color: 'var(--ink, #fff)',
                      fontSize: '14px',
                      fontWeight: 700,
                      textAlign: 'center',
                    }}
                    title="Select minute"
                  >
                    {['00','05','10','15','20','25','30','35','40','45','50','55'].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>

                  {/* AM / PM Toggle Pill Buttons */}
                  <div
                    style={{
                      display: 'inline-flex',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      background: 'var(--card-bg, #12121a)',
                      padding: '2px',
                      gap: '2px',
                    }}
                  >
                    <button
                      type="button"
                      className={`btn btn-sm ${manualPeriod === 'AM' ? 'btn-primary' : 'btn-ghost'}`}
                      style={{
                        padding: '6px 10px',
                        fontSize: '12px',
                        fontWeight: 700,
                        borderRadius: '6px',
                        border: 'none',
                        background: manualPeriod === 'AM' ? 'var(--accent, #6366f1)' : 'transparent',
                        color: manualPeriod === 'AM' ? '#fff' : 'var(--ink-muted)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onClick={() => handlePeriodChange('AM')}
                    >
                      AM
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${manualPeriod === 'PM' ? 'btn-primary' : 'btn-ghost'}`}
                      style={{
                        padding: '6px 10px',
                        fontSize: '12px',
                        fontWeight: 700,
                        borderRadius: '6px',
                        border: 'none',
                        background: manualPeriod === 'PM' ? 'var(--accent, #6366f1)' : 'transparent',
                        color: manualPeriod === 'PM' ? '#fff' : 'var(--ink-muted)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      onClick={() => handlePeriodChange('PM')}
                    >
                      PM
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick time dialer presets */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', paddingTop: '2px' }}>
              <span style={{ fontSize: '11px', color: 'var(--ink-muted)' }}>Quick Presets:</span>
              {[
                { label: '09:00 AM', h: '09', m: '00', p: 'AM' },
                { label: '11:00 AM', h: '11', m: '00', p: 'AM' },
                { label: '02:00 PM', h: '02', m: '00', p: 'PM' },
                { label: '04:30 PM', h: '04', m: '30', p: 'PM' },
                { label: '06:00 PM', h: '06', m: '00', p: 'PM' },
                { label: '07:00 PM', h: '07', m: '00', p: 'PM' },
                { label: '08:30 PM', h: '08', m: '30', p: 'PM' },
              ].map((preset) => {
                const isCurrent = manualHour === preset.h && manualMinute === preset.m && manualPeriod === preset.p;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyPreset(preset.h, preset.m, preset.p)}
                    className="btn btn-ghost"
                    style={{
                      padding: '2px 7px',
                      fontSize: '11px',
                      borderRadius: '5px',
                      border: isCurrent ? '1px solid var(--accent, #6366f1)' : '1px solid var(--border)',
                      background: isCurrent ? 'rgba(99, 102, 241, 0.18)' : 'rgba(255,255,255,0.03)',
                      color: isCurrent ? 'var(--accent, #6366f1)' : 'var(--ink)',
                      fontWeight: isCurrent ? 700 : 500,
                    }}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Live Confirmation Preview Badge */}
            {manualDate && (
              <div
                style={{
                  padding: '9px 12px',
                  borderRadius: '7px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.25)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#059669',
                  fontSize: '12.5px',
                  fontWeight: 600,
                }}
              >
                <CheckCircleIcon size={15} />
                <span>
                  Selected Time: {formatManualPreview(manualDate, manualHour, manualMinute, manualPeriod)}
                </span>
              </div>
            )}
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
              isScheduleMode
                ? `Add any preparation topics or notes for ${targetName}...`
                : userRole === 'mentor'
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
              isScheduleMode ? 'Scheduling...' : 'Updating...'
            ) : isScheduleMode ? (
              'Confirm Schedule'
            ) : userRole === 'mentor' || userRole === 'admin' || effectiveContractId ? (
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
