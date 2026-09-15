import React, { useState, useEffect } from 'react';
import PortalLayout from '../../components/PortalLayout';
import { api, mentorCalendarSettings } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context';
import { PlusIcon, CalendarIcon } from '../../components/Icons';

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const TIMEZONES = [
  { value: 'Asia/Kolkata', label: 'Asia/Kolkata (IST - UTC+05:30)' },
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'America/New_York (EST/EDT - UTC-05:00)' },
  { value: 'America/Los_Angeles', label: 'America/Los_Angeles (PST/PDT - UTC-08:00)' },
  { value: 'Europe/London', label: 'Europe/London (GMT/BST - UTC+00:00)' },
  { value: 'Asia/Singapore', label: 'Asia/Singapore (SGT - UTC+08:00)' },
];

export default function MentorAvailabilityPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [schedule, setSchedule] = useState(() =>
    DAY_NAMES.map((name, idx) => ({
      day_of_week: idx,
      day_name: name,
      enabled: idx >= 1 && idx <= 5, // default Mon-Fri
      start_time: '18:00',
      end_time: '21:00',
    }))
  );
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [durations, setDurations] = useState([30, 60, 90]);
  const [bufferTime, setBufferTimeState] = useState(15);
  const [blockedDates, setBlockedDates] = useState([]);
  const [calendarSync, setCalendarSyncState] = useState({ google: true, apple: false });

  // Add block date form
  const [newBlockDate, setNewBlockDate] = useState('');
  const [newBlockReason, setNewBlockReason] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadAvail() {
      try {
        if (user) {
          let existing = [];
          try {
            const res = await api.getAvailability();
            if (res && Array.isArray(res.slots)) {
              existing = res.slots;
            }
          } catch (_) {
            try {
              const mentor = await api.getMentor(user.id);
              if (mentor && Array.isArray(mentor.availability)) {
                existing = mentor.availability;
              }
            } catch (_) {}
          }

          if (existing.length > 0) {
            setSchedule((prev) =>
              prev.map((day) => {
                const match = existing.find((s) => Number(s.day_of_week) === Number(day.day_of_week));
                if (match) {
                  return {
                    ...day,
                    enabled: true,
                    start_time: match.start_time ? match.start_time.slice(0, 5) : '18:00',
                    end_time: match.end_time ? match.end_time.slice(0, 5) : '21:00',
                  };
                }
                return { ...day, enabled: false };
              })
            );
          }
        }
      } catch (err) {
        console.error('Failed to load availability from backend:', err);
      } finally {
        setLoading(false);
      }
    }

    loadAvail();
    setBlockedDates(mentorCalendarSettings.getBlockedDates());
    setBufferTimeState(mentorCalendarSettings.getBufferTime());
    setCalendarSyncState(mentorCalendarSettings.getCalendarSync());
    setTimezone(mentorCalendarSettings.getTimezone());
    setDurations(mentorCalendarSettings.getDurations());
  }, [user]);

  const handleToggle = (idx) => {
    setSuccess('');
    setSchedule((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, enabled: !item.enabled } : item))
    );
  };

  const handleTimeChange = (idx, field, value) => {
    setSuccess('');
    setSchedule((prev) =>
      prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item))
    );
  };

  const applyPreset = (type) => {
    setSuccess('');
    if (type === 'weekdays-evening') {
      setSchedule((prev) =>
        prev.map((d) => ({
          ...d,
          enabled: d.day_of_week >= 1 && d.day_of_week <= 5,
          start_time: '18:00',
          end_time: '21:30',
        }))
      );
      toast.success('Applied Evenings preset (6:00 PM – 9:30 PM, Mon-Fri)');
    } else if (type === 'full-time') {
      setSchedule((prev) =>
        prev.map((d) => ({
          ...d,
          enabled: d.day_of_week >= 1 && d.day_of_week <= 5,
          start_time: '10:00',
          end_time: '18:00',
        }))
      );
      toast.success('Applied Full Time preset (10:00 AM – 6:00 PM, Mon-Fri)');
    } else if (type === 'weekends') {
      setSchedule((prev) =>
        prev.map((d) => ({
          ...d,
          enabled: d.day_of_week === 0 || d.day_of_week === 6,
          start_time: '11:00',
          end_time: '17:00',
        }))
      );
      toast.success('Applied Weekends preset (11:00 AM – 5:00 PM, Sat-Sun)');
    }
  };

  const handleDurationToggle = (dur) => {
    setSuccess('');
    setDurations((prev) => {
      if (prev.includes(dur)) {
        if (prev.length === 1) return prev; // keep at least 1
        return prev.filter((d) => d !== dur);
      }
      return [...prev, dur].sort();
    });
  };

  const handleAddBlockedDate = (e) => {
    e.preventDefault();
    if (!newBlockDate) return;
    const item = { date: newBlockDate, reason: newBlockReason || 'Personal Time / Out of Office' };
    const updated = mentorCalendarSettings.addBlockedDate(item);
    setBlockedDates([...updated]);
    setNewBlockDate('');
    setNewBlockReason('');
    toast.success(`Date ${newBlockDate} blocked on your calendar.`);
  };

  const handleRemoveBlockedDate = (id) => {
    const updated = mentorCalendarSettings.removeBlockedDate(id);
    setBlockedDates([...updated]);
    toast.info('Blocked date removed.');
  };

  const handleSave = async () => {
    setError('');
    setSuccess('');

    // Validation: ensure all enabled days have end_time > start_time
    const enabledDays = schedule.filter((d) => d.enabled);
    for (const day of enabledDays) {
      if (!day.start_time || !day.end_time) {
        const msg = `Please specify both start and end times for ${day.day_name}.`;
        setError(msg);
        toast.error(msg);
        return;
      }
      if (day.start_time >= day.end_time) {
        const msg = `${day.day_name}: End time (${day.end_time}) must be after start time (${day.start_time}).`;
        setError(msg);
        toast.error(msg);
        return;
      }
    }

    setSaving(true);
    try {
      const slots = enabledDays.map((d) => ({
        day_of_week: d.day_of_week,
        start_time: d.start_time,
        end_time: d.end_time,
      }));

      await api.setAvailability(slots);
      mentorCalendarSettings.setBufferTime(bufferTime);
      mentorCalendarSettings.setCalendarSync(calendarSync);
      mentorCalendarSettings.setTimezone(timezone);
      mentorCalendarSettings.setDurations(durations);

      const msg = 'All availability settings, buffer intervals, and working hours saved successfully!';
      setSuccess(msg);
      toast.success(msg);
    } catch (err) {
      toast.error(err.message || 'Failed to save availability');
      setError(err.message || 'Failed to save availability');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PortalLayout
      title="Availability & Working Hours"
      portalType="mentor"
      actions={
        <button
          type="button"
          className="btn btn-primary"
          style={{ fontSize: '13px' }}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Availability'}
        </button>
      }
    >
      <p className="sub" style={{ maxWidth: '800px', marginBottom: '20px' }}>
        Configure your weekly pairing slots, timezone, buffer padding, session durations, and blocked holiday dates.
      </p>

      {error && <div className="error-box" style={{ maxWidth: '800px', marginBottom: '16px' }}>{error}</div>}
      {success && (
        <div
          style={{
            maxWidth: '800px',
            marginBottom: '16px',
            padding: '12px 16px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: '8px',
            color: '#34D399',
            fontSize: '13.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ fontWeight: 700 }}>✓</span>
          <span>{success}</span>
        </div>
      )}

      <div style={{ maxWidth: '800px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Working Hours Schedule Panel */}
        <div className="panel" style={{ margin: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div className="section-label" style={{ marginTop: 0 }}>Weekly Working Hours</div>
              <div className="sub" style={{ fontSize: '12px' }}>Enable days you are available and set active hours</div>
            </div>

            <div style={{ display: 'flex', gap: '6px' }}>
              <button type="button" className="btn btn-ghost" style={{ fontSize: '11.5px', padding: '4px 8px' }} onClick={() => applyPreset('weekdays-evening')}>
                Evenings (6-9:30 PM)
              </button>
              <button type="button" className="btn btn-ghost" style={{ fontSize: '11.5px', padding: '4px 8px' }} onClick={() => applyPreset('full-time')}>
                Full Time (10-6 PM)
              </button>
              <button type="button" className="btn btn-ghost" style={{ fontSize: '11.5px', padding: '4px 8px' }} onClick={() => applyPreset('weekends')}>
                Weekends
              </button>
            </div>
          </div>

          {loading ? (
            <p className="sub">Loading your schedule...</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {schedule.map((day, idx) => (
                <div
                  key={day.day_of_week}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 14px',
                    background: day.enabled ? 'var(--card-bg, #1a1a24)' : 'transparent',
                    borderRadius: '8px',
                    border: day.enabled ? '1px solid var(--border)' : '1px dashed var(--border)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={day.enabled}
                    onChange={() => handleToggle(idx)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ width: '100px', fontWeight: 600, fontSize: '13.5px', color: day.enabled ? 'var(--ink)' : 'var(--text-muted)' }}>
                    {day.day_name}
                  </span>

                  {day.enabled ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input
                        type="time"
                        value={day.start_time}
                        onChange={(e) => handleTimeChange(idx, 'start_time', e.target.value)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--border)',
                          background: 'var(--panel-bg)',
                          fontSize: '13px',
                        }}
                      />
                      <span className="sub" style={{ margin: 0, fontSize: '12px' }}>to</span>
                      <input
                        type="time"
                        value={day.end_time}
                        onChange={(e) => handleTimeChange(idx, 'end_time', e.target.value)}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--border)',
                          background: 'var(--panel-bg)',
                          fontSize: '13px',
                        }}
                      />
                    </div>
                  ) : (
                    <span className="sub" style={{ fontSize: '12.5px', fontStyle: 'italic' }}>
                      Unavailable / Off day
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Timezone & Buffers Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '20px' }}>
          {/* Timezone & Buffer Time */}
          <div className="panel" style={{ margin: 0 }}>
            <div className="section-label" style={{ marginTop: 0 }}>Timezone &amp; Buffers</div>

            <div className="field">
              <label>Primary Timezone</label>
              <select value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                {TIMEZONES.map((tz) => (
                  <option key={tz.value} value={tz.value}>
                    {tz.label}
                  </option>
                ))}
              </select>
              <div className="sub" style={{ fontSize: '11px', marginTop: '4px' }}>
                All session slots will be automatically localized for learners worldwide.
              </div>
            </div>

            <div className="field">
              <label>Buffer Time Between Sessions</label>
              <select
                value={bufferTime}
                onChange={(e) => setBufferTimeState(Number(e.target.value))}
              >
                <option value={0}>0 Minutes (Back to back)</option>
                <option value={15}>15 Minutes (Recommended)</option>
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes</option>
              </select>
              <div className="sub" style={{ fontSize: '11px', marginTop: '4px' }}>
                Prevents back-to-back fatigue and allows writing session notes.
              </div>
            </div>
          </div>

          {/* Session Duration Preferences */}
          <div className="panel" style={{ margin: 0 }}>
            <div className="section-label" style={{ marginTop: 0 }}>Session Duration Preferences</div>
            <p className="sub" style={{ fontSize: '12px', margin: '0 0 12px' }}>
              Choose which session lengths learners are allowed to book on your calendar:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                { dur: 30, label: '30 Minutes', desc: 'Quick diagnosis, fast Q&A, and quick advice' },
                { dur: 60, label: '60 Minutes (1 hour)', desc: 'Standard pairing, deep bug tracing, code review' },
                { dur: 90, label: '90 Minutes', desc: 'Complex system architecture & end-to-end debugging' },
              ].map((item) => (
                <label
                  key={item.dur}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '10px 12px',
                    background: durations.includes(item.dur) ? 'rgba(79, 70, 229, 0.08)' : 'var(--panel-bg)',
                    border: durations.includes(item.dur) ? '1px solid var(--brand)' : '1px solid var(--border)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={durations.includes(item.dur)}
                    onChange={() => handleDurationToggle(item.dur)}
                    style={{ marginTop: '2px' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{item.label}</div>
                    <div className="sub" style={{ fontSize: '11px', margin: '2px 0 0' }}>{item.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Blocked Dates & Vacation Calendar Manager */}
        <div className="panel" style={{ margin: 0 }}>
          <div className="section-label" style={{ marginTop: 0 }}>Blocked Dates &amp; Out of Office</div>
          <p className="sub" style={{ fontSize: '12px', margin: '0 0 14px' }}>
            Block specific dates or vacation windows so learners cannot schedule sessions on those days.
          </p>

          {/* Add Block Date Form */}
          <form onSubmit={handleAddBlockedDate} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr auto', gap: '10px', marginBottom: '16px' }}>
            <input
              type="date"
              value={newBlockDate}
              onChange={(e) => setNewBlockDate(e.target.value)}
              required
            />
            <input
              type="text"
              placeholder="Reason (e.g. Vacation, Conference, Holiday)"
              value={newBlockReason}
              onChange={(e) => setNewBlockReason(e.target.value)}
            />
            <button type="submit" className="btn btn-secondary" style={{ fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <PlusIcon size={14} /> Block Date
            </button>
          </form>

          {/* Blocked dates list */}
          {blockedDates.length === 0 ? (
            <p className="sub" style={{ fontSize: '12px', margin: 0 }}>No dates currently blocked.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {blockedDates.map((b) => (
                <div
                  key={b.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '8px 12px',
                    background: 'var(--card-bg, #1a1a24)',
                    border: '1px solid var(--border)',
                    borderRadius: '6px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CalendarIcon size={14} />
                    <span style={{ fontWeight: 600, fontSize: '13px' }}>{b.date}</span>
                    <span className="sub" style={{ fontSize: '12px', marginLeft: '6px' }}>{b.reason}</span>
                  </div>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ color: 'var(--danger, #ef4444)', fontSize: '12px', padding: '2px 8px' }}
                    onClick={() => handleRemoveBlockedDate(b.id)}
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* External Calendar Sync */}
        <div className="panel" style={{ margin: 0 }}>
          <div className="section-label" style={{ marginTop: 0 }}>External Calendar Synchronization</div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px', marginTop: '10px' }}>
            <div style={{ padding: '14px', background: 'var(--card-bg, #1a1a24)', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CalendarIcon size={20} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>Google Calendar</div>
                  <div className="sub" style={{ fontSize: '11px' }}>2-way real-time calendar sync</div>
                </div>
              </div>
              <button
                type="button"
                className={`btn ${calendarSync.google ? 'btn-ghost' : 'btn-secondary'}`}
                style={{ fontSize: '12px' }}
                onClick={() => setCalendarSyncState((s) => ({ ...s, google: !s.google }))}
              >
                {calendarSync.google ? 'Connected' : 'Connect'}
              </button>
            </div>

            <div style={{ padding: '14px', background: 'var(--card-bg, #1a1a24)', borderRadius: '8px', border: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CalendarIcon size={20} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px' }}>Apple Calendar (iCal)</div>
                  <div className="sub" style={{ fontSize: '11px' }}>Feed export URL subscription</div>
                </div>
              </div>
              <button
                type="button"
                className={`btn ${calendarSync.apple ? 'btn-ghost' : 'btn-secondary'}`}
                style={{ fontSize: '12px' }}
                onClick={() => setCalendarSyncState((s) => ({ ...s, apple: !s.apple }))}
              >
                {calendarSync.apple ? 'Subscribed' : 'Subscribe'}
              </button>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Availability Settings'}
          </button>
        </div>
      </div>
    </PortalLayout>
  );
}
