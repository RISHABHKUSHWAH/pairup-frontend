import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import { api, mentorCalendarSettings } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { ClockIcon, CalendarIcon, MessageIcon, VideoIcon } from '../../components/Icons';
import { useToast } from '../../context';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function MentorCalendarPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState('month'); // month, week, day
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Block time state
  const [blockModalOpen, setBlockModalOpen] = useState(false);
  const [blockedDates, setBlockedDates] = useState([]);
  const [blockForm, setBlockForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    startTime: '10:00',
    endTime: '18:00',
    reason: 'Personal block',
  });

  // Selected session modal
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    loadCalendarData();
  }, []);

  const loadCalendarData = async () => {
    setLoading(true);
    try {
      const data = await api.getBookings().catch(() => []);
      setBookings(data);
      setBlockedDates(mentorCalendarSettings.getBlockedDates());
    } catch (err) {
      console.error('Failed to load calendar data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrev = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') next.setMonth(next.getMonth() - 1);
    else if (viewMode === 'week') next.setDate(next.getDate() - 7);
    else next.setDate(next.getDate() - 1);
    setCurrentDate(next);
  };

  const handleNext = () => {
    const next = new Date(currentDate);
    if (viewMode === 'month') next.setMonth(next.getMonth() + 1);
    else if (viewMode === 'week') next.setDate(next.getDate() + 7);
    else next.setDate(next.getDate() + 1);
    setCurrentDate(next);
  };

  const handleBlockTime = (e) => {
    e.preventDefault();
    const updated = mentorCalendarSettings.addBlockedDate(blockForm);
    setBlockedDates(updated);
    setBlockModalOpen(false);
    toast.success('Time blocked successfully on your calendar!');
  };

  const handleUnblock = (id) => {
    const updated = mentorCalendarSettings.removeBlockedDate(id);
    setBlockedDates(updated);
    toast.info('Time unblocked');
  };

  // Calendar generation helpers
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Map bookings to day
  const getBookingsForDate = (y, m, d) => {
    return bookings.filter((b) => {
      const dateStr = b.scheduled_at || b.created_at;
      if (!dateStr) return false;
      const bDate = new Date(dateStr);
      return (
        bDate.getFullYear() === y &&
        bDate.getMonth() === m &&
        bDate.getDate() === d
      );
    });
  };

  const getBlockedForDate = (y, m, d) => {
    const targetStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    return blockedDates.filter((bl) => bl.date === targetStr);
  };

  const upcomingSessions = bookings.filter((b) => ['accepted', 'paid', 'pending'].includes(b.status));

  return (
    <PortalLayout
      title="Session Calendar"
      portalType="mentor"
      actions={
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-ghost"
            style={{ fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={() => setBlockModalOpen(true)}
          >
            <ClockIcon size={14} /> Block Time
          </button>
          <Link
            to="/mentor/availability"
            className="btn btn-primary"
            style={{ fontSize: '12.5px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <CalendarIcon size={14} /> Working Hours
          </Link>
        </div>
      }
    >
      <p className="sub" style={{ marginBottom: '20px' }}>
        Visualize your scheduled 1-on-1 pairing sessions, manage booked slots, and block personal time.
      </p>

      {/* Calendar Header & View Switchers */}
      <div
        className="card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          padding: '14px 18px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={handlePrev}
            >
              ◀ Prev
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={handleNext}
            >
              Next ▶
            </button>
          </div>
          <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800 }}>
            {MONTHS[month]} {year}
          </h3>
        </div>

        {/* View Mode Tabs: Month / Week / Day */}
        <div className="admin-filter-tabs" style={{ margin: 0 }}>
          <button
            type="button"
            className={`admin-filter-tab ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => setViewMode('month')}
            style={{ padding: '6px 14px', fontSize: '12px' }}
          >
            Month
          </button>
          <button
            type="button"
            className={`admin-filter-tab ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => setViewMode('week')}
            style={{ padding: '6px 14px', fontSize: '12px' }}
          >
            Week
          </button>
          <button
            type="button"
            className={`admin-filter-tab ${viewMode === 'day' ? 'active' : ''}`}
            onClick={() => setViewMode('day')}
            style={{ padding: '6px 14px', fontSize: '12px' }}
          >
            Day
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 280px', gap: '20px' }}>
        {/* Main Calendar Area */}
        <div>
          {/* MONTH VIEW */}
          {viewMode === 'month' && (
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--grid-strong)',
                borderRadius: '12px',
                overflow: 'hidden',
              }}
            >
              {/* Day names header */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                  background: 'var(--bg)',
                  borderBottom: '1px solid var(--grid-strong)',
                  textAlign: 'center',
                  fontWeight: 600,
                  fontSize: '12px',
                  color: 'var(--ink-muted)',
                  padding: '8px 0',
                }}
              >
                {DAYS.map((d) => (
                  <div key={d}>{d}</div>
                ))}
              </div>

              {/* Month Days Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(7, 1fr)',
                }}
              >
                {/* Empty cells before month start */}
                {Array.from({ length: firstDayIndex }).map((_, i) => (
                  <div
                    key={'empty-' + i}
                    style={{
                      minHeight: '85px',
                      background: 'rgba(0,0,0,0.01)',
                      borderRight: '1px solid var(--grid)',
                      borderBottom: '1px solid var(--grid)',
                    }}
                  />
                ))}

                {/* Days of Month */}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const dayNum = i + 1;
                  const isToday =
                    new Date().getDate() === dayNum &&
                    new Date().getMonth() === month &&
                    new Date().getFullYear() === year;

                  const dayBookings = getBookingsForDate(year, month, dayNum);
                  const dayBlocked = getBlockedForDate(year, month, dayNum);

                  return (
                    <div
                      key={'day-' + dayNum}
                      style={{
                        minHeight: '85px',
                        padding: '6px',
                        borderRight: '1px solid var(--grid)',
                        borderBottom: '1px solid var(--grid)',
                        background: isToday ? 'var(--accent-soft)' : 'transparent',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div
                        style={{
                          fontWeight: isToday ? 800 : 600,
                          fontSize: '12px',
                          color: isToday ? 'var(--accent)' : 'var(--ink)',
                        }}
                      >
                        {dayNum} {isToday && '•'}
                      </div>

                      {/* Blocked Badges */}
                      {dayBlocked.map((bl) => (
                        <div
                          key={bl.id}
                          style={{
                            background: 'var(--warn-bg)',
                            color: 'var(--warn)',
                            fontSize: '9.5px',
                            fontWeight: 700,
                            padding: '2px 4px',
                            borderRadius: '4px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={`Blocked: ${bl.reason} (${bl.startTime} - ${bl.endTime})`}
                        >
                          {bl.reason}
                        </div>
                      ))}

                      {/* Bookings Badges */}
                      {dayBookings.map((b) => (
                        <div
                          key={b.id}
                          onClick={() => setSelectedSession(b)}
                          style={{
                            background: b.status === 'paid' ? 'var(--add-bg)' : 'var(--accent-soft)',
                            color: b.status === 'paid' ? 'var(--add)' : 'var(--accent)',
                            fontSize: '9.5px',
                            fontWeight: 700,
                            padding: '2px 4px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                          title={`Session with ${b.learner_name}: ${b.topic}`}
                        >
                          {b.learner_name}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* WEEK VIEW */}
          {viewMode === 'week' && (
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--grid-strong)',
                borderRadius: '12px',
                padding: '16px',
              }}
            >
              <h4 style={{ margin: '0 0 14px 0', fontSize: '15px' }}>Week Schedule &amp; Slots</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                {DAYS.map((d, idx) => (
                  <div key={d} className="card" style={{ padding: '10px 8px', textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px' }}>{d}</div>
                    <div className="sub" style={{ fontSize: '11px', margin: '4px 0 8px' }}>
                      Available 18:00 - 21:00
                    </div>
                    <span className="tag" style={{ fontSize: '9px', padding: '2px 4px' }}>
                      3 Open Slots
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DAY VIEW */}
          {viewMode === 'day' && (
            <div
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--grid-strong)',
                borderRadius: '12px',
                padding: '20px',
              }}
            >
              <h4 style={{ margin: '0 0 12px 0', fontSize: '16px' }}>
                Daily Schedule: {currentDate.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {['09:00', '10:00', '11:00', '14:00', '16:00', '18:00', '19:00', '20:00'].map((time) => (
                  <div
                    key={time}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '14px',
                      padding: '10px 14px',
                      borderRadius: '8px',
                      background: 'var(--bg)',
                      border: '1px solid var(--grid)',
                    }}
                  >
                    <span className="mono" style={{ fontWeight: 700, fontSize: '13px', width: '55px' }}>{time}</span>
                    <span className="sub" style={{ margin: 0, fontSize: '12.5px' }}>
                      {time === '18:00' ? '🟢 Available for Pairing Sessions' : 'Available on request'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Upcoming Sessions & Blocked Dates */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="admin-panel" style={{ margin: 0 }}>
            <div className="admin-panel-head">
              <h3>Upcoming ({upcomingSessions.length})</h3>
              <Link to="/mentor/sessions">All</Link>
            </div>

            {upcomingSessions.length === 0 ? (
              <p className="sub" style={{ fontSize: '12px' }}>No upcoming sessions booked.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {upcomingSessions.map((b) => (
                  <div
                    key={b.id}
                    className="mini-card"
                    style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedSession(b)}
                  >
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{b.learner_name}</div>
                    <div className="sub" style={{ margin: '2px 0', fontSize: '11.5px' }}>
                      {b.topic || 'Pairing'}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                      <span className={`status-badge badge-${b.status} mono`} style={{ fontSize: '9px', padding: '2px 6px' }}>
                        {b.status}
                      </span>
                      <span className="mono" style={{ fontSize: '11px', fontWeight: 700 }}>
                        ₹{b.price}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Blocked Dates list */}
          <div className="admin-panel" style={{ margin: 0 }}>
            <div className="admin-panel-head">
              <h3>Blocked Dates</h3>
            </div>

            {blockedDates.length === 0 ? (
              <p className="sub" style={{ fontSize: '12px' }}>No dates blocked.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {blockedDates.map((bl) => (
                  <div
                    key={bl.id}
                    className="mini-card"
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px' }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '12px' }}>{bl.date}</div>
                      <div className="sub" style={{ margin: 0, fontSize: '11px' }}>{bl.reason}</div>
                    </div>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: 'var(--warn)', cursor: 'pointer' }}
                      onClick={() => handleUnblock(bl.id)}
                      title="Unblock date"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Block Time Modal */}
      <Modal
        isOpen={blockModalOpen}
        onClose={() => setBlockModalOpen(false)}
        title="Block Calendar Time"
      >
        <form onSubmit={handleBlockTime}>
          <div className="field">
            <label>Date to Block</label>
            <input
              type="date"
              value={blockForm.date}
              onChange={(e) => setBlockForm({ ...blockForm, date: e.target.value })}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="field">
              <label>From Time</label>
              <input
                type="time"
                value={blockForm.startTime}
                onChange={(e) => setBlockForm({ ...blockForm, startTime: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>To Time</label>
              <input
                type="time"
                value={blockForm.endTime}
                onChange={(e) => setBlockForm({ ...blockForm, endTime: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="field">
            <label>Reason for Block</label>
            <input
              type="text"
              value={blockForm.reason}
              onChange={(e) => setBlockForm({ ...blockForm, reason: e.target.value })}
              placeholder="e.g. Doctor appointment, Vacation, Focus day"
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setBlockModalOpen(false)}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              Block Time
            </button>
          </div>
        </form>
      </Modal>

      {/* Selected Session Modal */}
      <Modal
        isOpen={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        title={`Session: ${selectedSession?.learner_name || ''}`}
      >
        {selectedSession && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span className={`status-badge badge-${selectedSession.status} mono`}>
                {selectedSession.status}
              </span>
              <span className="mono" style={{ fontWeight: 700 }}>
                ₹{selectedSession.price} ({selectedSession.duration_minutes || 60}m)
              </span>
            </div>

            <div className="section-label" style={{ marginTop: 0 }}>Topic &amp; Goal</div>
            <p className="sub" style={{ fontSize: '13.5px' }}>
              {selectedSession.topic || 'General Pairing Session'}
            </p>

            <div className="section-label">Learner Information</div>
            <div style={{ fontWeight: 600, fontSize: '13px' }}>{selectedSession.learner_name}</div>
            <div className="mono" style={{ fontSize: '11.5px', color: 'var(--ink-muted)' }}>
              Scheduled for: {selectedSession.scheduled_at ? new Date(selectedSession.scheduled_at).toLocaleString() : 'Flexible'}
            </div>

            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <Link
                to={`/chat?with=${selectedSession.learner_id}&name=${encodeURIComponent(selectedSession.learner_name)}`}
                className="btn btn-ghost"
                style={{ flex: 1, justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <MessageIcon size={14} /> Chat
              </Link>
              {selectedSession.status === 'paid' && (
                <Link
                  to={`/session?booking_id=${selectedSession.id}`}
                  className="btn btn-primary"
                  style={{ flex: 1, justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <VideoIcon size={14} /> Join Session Room
                </Link>
              )}
            </div>
          </div>
        )}
      </Modal>
    </PortalLayout>
  );
}
