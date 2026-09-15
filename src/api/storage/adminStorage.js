/**
 * Admin LocalStorage and Mock Services
 */
import { learnerNotifications } from './learnerStorage';
import { mentorNotifications } from './mentorStorage';
import { apiFetch } from '../http';

let supportBroadcastChannel = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    supportBroadcastChannel = new BroadcastChannel('pairup_support_channel');
    supportBroadcastChannel.onmessage = (event) => {
      try {
        if (event.data?.type === 'pairup_support_tickets_updated') {
          window.dispatchEvent(new CustomEvent('pairup_support_tickets_updated', { detail: event.data }));
        } else if (event.data?.type === 'pairup_notifications_updated') {
          window.dispatchEvent(new CustomEvent('pairup_notifications_updated', { detail: event.data?.notifItem }));
        }
      } catch {}
    };
  }
} catch {}

export const adminRefunds = {
  getDefaults: () => [
    {
      id: 'ref_101',
      learner_name: 'Rahul Sharma',
      learner_id: 3,
      mentor_name: 'Alex Rivera',
      mentor_id: 2,
      booking_id: 12,
      amount: 1000,
      reason: 'Mentor had network connectivity failure and could not conduct the final 30 minutes of session.',
      status: 'pending',
      created_at: '2026-03-05T14:20:00Z',
    },
    {
      id: 'ref_102',
      learner_name: 'Priya Patel',
      learner_id: 4,
      mentor_name: 'David Chen',
      mentor_id: 5,
      booking_id: 9,
      amount: 1500,
      reason: 'Session cancelled mutually more than 24 hours in advance.',
      status: 'approved',
      created_at: '2026-03-03T11:10:00Z',
    },
    {
      id: 'ref_103',
      learner_name: 'Amit Verma',
      learner_id: 6,
      mentor_name: 'Sarah Connor',
      mentor_id: 7,
      booking_id: 14,
      amount: 800,
      reason: 'Learner was a no-show for the scheduled slot.',
      status: 'rejected',
      created_at: '2026-02-28T09:00:00Z',
    },
  ],
  getRefunds: () => {
    try {
      const stored = localStorage.getItem('pairup_admin_refunds');
      if (stored) return JSON.parse(stored);
    } catch {}
    const def = adminRefunds.getDefaults();
    localStorage.setItem('pairup_admin_refunds', JSON.stringify(def));
    return def;
  },
  updateStatus: (id, status, adminNotes = '') => {
    const list = adminRefunds.getRefunds().map((r) =>
      r.id === id ? { ...r, status, adminNotes, resolved_at: new Date().toISOString() } : r
    );
    localStorage.setItem('pairup_admin_refunds', JSON.stringify(list));
    return list;
  },
};

export const adminCommissions = {
  getDefaultRules: () => ({
    baseCommissionPercent: 10,
    highVolumeThreshold: 30,
    highVolumeCommissionPercent: 8,
    fixedGatewayFee: 15,
    gstTaxPercent: 18,
    payoutHoldingPeriodHours: 2,
  }),
  getRules: () => {
    try {
      const stored = localStorage.getItem('pairup_admin_commission_rules');
      if (stored) return JSON.parse(stored);
    } catch {}
    const def = adminCommissions.getDefaultRules();
    localStorage.setItem('pairup_admin_commission_rules', JSON.stringify(def));
    return def;
  },
  saveRules: (rules) => {
    localStorage.setItem('pairup_admin_commission_rules', JSON.stringify(rules));
    return rules;
  },
};

export const adminReports = {
  getAnalytics: () => ({
    userGrowth: [
      { month: 'Oct 2025', learners: 42, mentors: 14, total: 56 },
      { month: 'Nov 2025', learners: 85, mentors: 28, total: 113 },
      { month: 'Dec 2025', learners: 150, mentors: 45, total: 195 },
      { month: 'Jan 2026', learners: 240, mentors: 68, total: 308 },
      { month: 'Feb 2026', learners: 380, mentors: 92, total: 472 },
      { month: 'Mar 2026', learners: 512, mentors: 124, total: 636 },
    ],
    sessions: {
      totalBooked: 284,
      completed: 258,
      completionRate: 90.8,
      cancelled: 18,
      disputed: 8,
      avgDurationMinutes: 52,
      durationBreakdown: { '30m': 45, '45m': 62, '60m': 142, '90m+': 35 },
    },
    finance: {
      grossVolume: 342000,
      netMentorPayouts: 307800,
      platformRevenue: 34200,
      escrowHeld: 18500,
      refundedAmount: 4300,
      avgBookingValue: 1204,
    },
    platformKpis: {
      problemsPosted: 312,
      problemsSolved: 268,
      problemSolveRate: 85.9,
      mentorAcceptanceRate: 74.2,
      proposalConversionRate: 48.6,
      repeatLearnerRate: 62.4,
      avgMentorRating: 4.88,
    },
  }),
};

export const adminNotifications = {
  getDefaultHistory: () => [
    {
      id: 'notif_1',
      title: 'Platform Maintenance Notice',
      message: 'PairUp will undergo brief infrastructure upgrades on Sunday 2:00 AM - 3:00 AM IST.',
      target: 'All Users',
      channels: ['In-App', 'Email'],
      sent_at: '2026-03-02T10:00:00Z',
      recipients_count: 636,
      status: 'Delivered',
    },
    {
      id: 'notif_2',
      title: 'New Instant UPI Payouts Enabled',
      message: 'Mentors can now receive session payouts in seconds via UPI ID.',
      target: 'All Mentors',
      channels: ['In-App', 'Push'],
      sent_at: '2026-02-25T15:30:00Z',
      recipients_count: 124,
      status: 'Delivered',
    },
    {
      id: 'notif_3',
      title: 'Spring Code Jam Announced',
      message: 'Post bug challenges and earn bonus wallet pairing credits all this week.',
      target: 'All Learners',
      channels: ['In-App'],
      sent_at: '2026-02-18T12:00:00Z',
      recipients_count: 512,
      status: 'Delivered',
    },
  ],
  getDefaultTemplates: () => [
    { id: 'tpl_welcome', name: 'Welcome Onboarding', subject: 'Welcome to PairUp — Start Pair Programming', channel: 'Email' },
    { id: 'tpl_booking', name: 'Session Confirmed', subject: 'Your live pairing session is confirmed', channel: 'In-App & Email' },
    { id: 'tpl_escrow', name: 'Escrow Released', subject: 'Your mentorship earnings have been deposited', channel: 'Email & Push' },
    { id: 'tpl_dispute', name: 'Dispute Case Update', subject: 'Update on your session arbitration case', channel: 'Email' },
  ],
  getNotifications: () => {
    try {
      const stored = localStorage.getItem('pairup_admin_notifications');
      if (stored) return JSON.parse(stored);
    } catch {}
    const def = adminNotifications.getDefaultHistory();
    localStorage.setItem('pairup_admin_notifications', JSON.stringify(def));
    return def;
  },
  sendNotification: (item) => {
    const list = adminNotifications.getNotifications();
    const newItem = {
      id: 'notif_' + Date.now(),
      sent_at: new Date().toISOString(),
      status: 'Delivered',
      ...item,
    };
    const updated = [newItem, ...list];
    localStorage.setItem('pairup_admin_notifications', JSON.stringify(updated));
    return updated;
  },
  getTemplates: () => {
    try {
      const stored = localStorage.getItem('pairup_admin_notif_templates');
      if (stored) return JSON.parse(stored);
    } catch {}
    const def = adminNotifications.getDefaultTemplates();
    localStorage.setItem('pairup_admin_notif_templates', JSON.stringify(def));
    return def;
  },
};

export const adminSupport = {
  getDefaults: () => [
    {
      id: 'SUP-2088',
      user_id: 3,
      user_name: 'Sarah Connor',
      user_email: 'sarah@example.com',
      user_role: 'learner',
      subject: 'Dispute on unfulfilled React Native code review contract',
      category: 'Billing & Escrow',
      priority: 'Urgent',
      status: 'Open',
      date: '2026-09-13',
      created_at: '2026-09-13T14:30:00Z',
      description: 'I booked a 90-minute session for React Native navigation debugging. The mentor disconnected after 15 minutes due to power outage and has not rescheduled. I would like an escrow refund or slot reschedule.',
      response: 'Hi Sarah, we are checking the session disconnect logs with our WebRTC monitor. We will freeze escrow release until resolved.',
      admin_notes: 'WebRTC logs confirm session ended abruptly at 14m22s. Waiting for mentor response before releasing escrow.',
      history: [
        { by: 'Sarah Connor (Learner)', text: 'Submitted support inquiry regarding disconnected session.', time: '2026-09-13 14:30' },
        { by: 'Admin Team', text: 'Status changed to Open. Escrow flagged for temporary hold.', time: '2026-09-13 14:45' },
      ],
    },
    {
      id: 'SUP-2041',
      user_id: 2,
      user_name: 'Alex Rivera',
      user_email: 'alex@example.com',
      user_role: 'mentor',
      subject: 'Inquiry regarding Escrow payment clearance timeline',
      category: 'Billing & Escrow',
      priority: 'Normal',
      status: 'In Review',
      date: '2026-09-11',
      created_at: '2026-09-11T09:15:00Z',
      description: 'Completed my pair programming session and learner marked it done. When will payout reflect in wallet?',
      response: 'Our automated payout engine processes completed escrow releases within 24 hours. Your payout is currently queued for disbursement.',
      admin_notes: 'Booking #24 approved. Payout scheduled for batch clearance today at 18:00 IST.',
      history: [
        { by: 'Alex Rivera (Mentor)', text: 'Asked about payout reflection timeframe.', time: '2026-09-11 09:15' },
        { by: 'Admin Team', text: 'Replied with clearance policy details. Marked In Review.', time: '2026-09-11 11:20' },
      ],
    },
    {
      id: 'SUP-2105',
      user_id: 5,
      user_name: 'Priya Patel',
      user_email: 'priya@example.com',
      user_role: 'mentor',
      subject: 'Bank account IFSC verification pending for over 48 hours',
      category: 'Account & Auth',
      priority: 'High',
      status: 'In Review',
      date: '2026-09-12',
      created_at: '2026-09-12T16:40:00Z',
      description: 'I submitted my HDFC bank account passbook for payout verification two days ago, but status still says Pending Verification.',
      response: 'Our compliance team is verifying the IFSC code and account holder name match. Review should complete today.',
      admin_notes: 'Passbook name matches profile name. Sent to banking partner API for penny drop validation.',
      history: [
        { by: 'Priya Patel (Mentor)', text: 'Requested status update on bank verification.', time: '2026-09-12 16:40' },
      ],
    },
    {
      id: 'SUP-2112',
      user_id: 6,
      user_name: 'Michael Zhang',
      user_email: 'michael@example.com',
      user_role: 'learner',
      subject: 'Monaco editor syntax highlighting for Rust/Wasm files',
      category: 'Technical Bug',
      priority: 'Normal',
      status: 'Open',
      date: '2026-09-14',
      created_at: '2026-09-14T01:10:00Z',
      description: 'When pairing on Rust code (.rs files), the editor defaults to plain text mode without rust-analyzer hints.',
      response: '',
      admin_notes: '',
      history: [
        { by: 'Michael Zhang (Learner)', text: 'Reported editor syntax mode bug for Rust files.', time: '2026-09-14 01:10' },
      ],
    },
    {
      id: 'SUP-1980',
      user_id: 4,
      user_name: 'David Chen',
      user_email: 'david@example.com',
      user_role: 'mentor',
      subject: 'Microphone permission issue on Safari macOS',
      category: 'Live Sessions',
      priority: 'Low',
      status: 'Resolved',
      date: '2026-09-06',
      created_at: '2026-09-06T11:00:00Z',
      description: 'Safari prompted for permission but WebRTC audio stayed muted during pairing.',
      response: 'Resolved in platform update v2.4 with fallback audio constraints and WebRTC automatic reconnect handlers.',
      admin_notes: 'Tested on Safari 17.5. Audio track binds properly now.',
      history: [
        { by: 'David Chen (Mentor)', text: 'Ticket submitted.', time: '2026-09-06 11:00' },
        { by: 'Admin Team', text: 'Resolved and deployed patch.', time: '2026-09-07 14:00' },
      ],
    },
    {
      id: 'SUP-1950',
      user_id: 8,
      user_name: 'Anita Desai',
      user_email: 'anita@example.com',
      user_role: 'mentor',
      subject: 'How to request 1099/TDS tax invoice for platform fees',
      category: 'Billing & Escrow',
      priority: 'Low',
      status: 'Resolved',
      date: '2026-08-28',
      created_at: '2026-08-28T10:20:00Z',
      description: 'Need tax deduction certificate for earnings in Q3.',
      response: 'Tax summary reports can now be generated directly from Admin/Earnings -> Download Tax Invoices.',
      admin_notes: 'Sent PDF receipt copy to user email as well.',
      history: [
        { by: 'Anita Desai (Mentor)', text: 'Ticket opened.', time: '2026-08-28 10:20' },
        { by: 'Admin Team', text: 'Provided PDF download link and marked resolved.', time: '2026-08-28 15:30' },
      ],
    },
  ],
  broadcastUpdate: (id) => {
    try {
      window.dispatchEvent(new CustomEvent('pairup_support_tickets_updated', { detail: { id } }));
    } catch {}
    try {
      if (supportBroadcastChannel) {
        supportBroadcastChannel.postMessage({ type: 'pairup_support_tickets_updated', id });
      }
    } catch {}
  },
  notifyUserOnTicketAction: (ticket, actionTitle, actionMessage) => {
    if (!ticket) return;
    const notifItem = {
      type: 'support',
      title: actionTitle || `Support Ticket ${ticket.id} Updated`,
      body: actionMessage || `Your inquiry "${ticket.subject}" status is now: ${ticket.status}.`,
      time: 'Just now',
      read: false,
      ticketId: ticket.id,
      link: ticket.user_role === 'mentor' ? '/mentor/dashboard' : '/learner/dashboard',
    };

    try {
      // Store in target notifications as well as both stores so testing across roles works seamlessly
      if (ticket.user_role === 'mentor') {
        mentorNotifications.addNotification(notifItem);
      } else if (ticket.user_role === 'learner') {
        learnerNotifications.addNotification(notifItem);
      } else {
        learnerNotifications.addNotification(notifItem);
        mentorNotifications.addNotification(notifItem);
      }
      // Also sync to the peer notification store for cross-role testing in the same browser
      learnerNotifications.addNotification(notifItem);
      mentorNotifications.addNotification(notifItem);

      window.dispatchEvent(new CustomEvent('pairup_notifications_updated', { detail: notifItem }));
      if (supportBroadcastChannel) {
        supportBroadcastChannel.postMessage({ type: 'pairup_notifications_updated', notifItem });
      }
    } catch {}
  },
  syncWithBackend: async () => {
    try {
      const backendTickets = await apiFetch('/api/support/tickets');
      if (Array.isArray(backendTickets) && backendTickets.length > 0) {
        const local = adminSupport.getTickets();
        const backendMap = new Map(backendTickets.map((t) => [t.id, t]));

        // Push any local-only tickets to the backend
        for (const lt of local) {
          if (lt && lt.id && !backendMap.has(lt.id)) {
            try {
              await apiFetch('/api/support/tickets', { method: 'POST', body: lt });
              backendTickets.unshift(lt);
              backendMap.set(lt.id, lt);
            } catch {}
          }
        }

        // Save fresh backend list as master in localStorage
        try {
          localStorage.setItem('pairup_admin_support_tickets', JSON.stringify(backendTickets));
        } catch {}

        // Propagate updates to all user role storage buckets
        try {
          const allKeys = Object.keys(localStorage);
          allKeys.forEach((key) => {
            if (key && key.startsWith('pairup_support_tickets_')) {
              try {
                const raw = localStorage.getItem(key);
                const userList = JSON.parse(raw || '[]');
                if (Array.isArray(userList) && userList.length > 0) {
                  let changed = false;
                  const nextUserList = userList.map((ut) => {
                    const serverVer = backendMap.get(ut.id);
                    if (serverVer) {
                      changed = true;
                      return { ...ut, ...serverVer };
                    }
                    return ut;
                  });
                  if (changed) {
                    localStorage.setItem(key, JSON.stringify(nextUserList));
                  }
                }
              } catch {}
            }
          });
        } catch {}

        adminSupport.broadcastUpdate();
        return backendTickets;
      }
    } catch {}
    return adminSupport.getTickets();
  },
  getTickets: () => {
    let list = [];
    try {
      const stored = localStorage.getItem('pairup_admin_support_tickets');
      if (stored) {
        list = JSON.parse(stored);
      }
    } catch {}

    if (!Array.isArray(list) || list.length === 0) {
      list = adminSupport.getDefaults();
      try {
        localStorage.setItem('pairup_admin_support_tickets', JSON.stringify(list));
      } catch {}
    }

    // Sanitize: ensure every item is a valid object with an id
    list = (Array.isArray(list) ? list : []).filter((t) => t && typeof t === 'object' && t.id);

    // Absorb any orphan user tickets submitted across the platform
    let dirty = false;
    try {
      const allKeys = Object.keys(localStorage);
      allKeys.forEach((key) => {
        if (key && key.startsWith('pairup_support_tickets_')) {
          try {
            const raw = localStorage.getItem(key);
            const parsed = JSON.parse(raw || '[]');
            if (Array.isArray(parsed)) {
              parsed.forEach((ut) => {
                if (ut && ut.id) {
                  const existingIdx = list.findIndex((t) => t.id === ut.id);
                  if (existingIdx === -1) {
                    list.push(ut);
                    dirty = true;
                  }
                }
              });
            }
          } catch {}
        }
      });
    } catch {}

    if (dirty) {
      try {
        localStorage.setItem('pairup_admin_support_tickets', JSON.stringify(list));
      } catch {}
    }

    return list;
  },
  saveTickets: (list) => {
    try {
      localStorage.setItem('pairup_admin_support_tickets', JSON.stringify(list));
    } catch {}

    // Synchronize updates to all user-facing stores in localStorage
    try {
      const allKeys = Object.keys(localStorage);
      allKeys.forEach((key) => {
        if (key && key.startsWith('pairup_support_tickets_')) {
          try {
            const raw = localStorage.getItem(key);
            const userList = JSON.parse(raw || '[]');
            if (Array.isArray(userList) && userList.length > 0) {
              let changed = false;
              const nextUserList = userList.map((ut) => {
                const adminVer = list.find((t) => t.id === ut.id);
                if (adminVer) {
                  changed = true;
                  return { ...ut, ...adminVer };
                }
                return ut;
              });
              if (changed) {
                localStorage.setItem(key, JSON.stringify(nextUserList));
              }
            }
          } catch {}
        }
      });
    } catch {}

    adminSupport.broadcastUpdate();
    return list;
  },
  getTicketById: (id) => {
    const list = adminSupport.getTickets();
    return list.find((t) => t.id === id) || null;
  },
  updateTicket: (id, updates) => {
    const list = adminSupport.getTickets();
    let targetTicket = null;
    const updated = list.map((t) => {
      if (t.id === id) {
        targetTicket = {
          ...t,
          ...updates,
          updated_at: new Date().toISOString(),
        };
        return targetTicket;
      }
      return t;
    });
    adminSupport.saveTickets(updated);

    if (targetTicket && updates.status) {
      adminSupport.notifyUserOnTicketAction(
        targetTicket,
        `Ticket ${id} Status: ${updates.status}`,
        `Your inquiry "${targetTicket.subject}" status was updated to "${updates.status}" by the Support Desk.`
      );
    }

    adminSupport.broadcastUpdate(id);

    // Asynchronously synchronize with backend API
    apiFetch(`/api/support/tickets/${id}`, { method: 'PUT', body: updates }).catch(() => {});

    return updated;
  },
  replyTicket: (id, responseText, newStatus, adminName = 'PairUp Support Desk') => {
    const list = adminSupport.getTickets();
    let targetTicket = null;
    const updated = list.map((t) => {
      if (t.id === id) {
        const newHistoryItem = {
          by: adminName,
          text: responseText,
          time: new Date().toISOString().replace('T', ' ').slice(0, 16),
        };
        const nextStatus = newStatus || t.status;
        targetTicket = {
          ...t,
          response: responseText,
          status: nextStatus,
          history: [...(t.history || []), newHistoryItem],
          updated_at: new Date().toISOString(),
          resolved_at: nextStatus === 'Resolved' || nextStatus === 'Closed' ? new Date().toISOString() : t.resolved_at,
        };
        return targetTicket;
      }
      return t;
    });
    adminSupport.saveTickets(updated);

    if (targetTicket) {
      const excerpt = responseText.length > 80 ? `${responseText.slice(0, 80)}...` : responseText;
      adminSupport.notifyUserOnTicketAction(
        targetTicket,
        `New Support Desk Response on ${id}`,
        `Official reply: "${excerpt}" (Status: ${targetTicket.status})`
      );
    }

    adminSupport.broadcastUpdate(id);

    // Asynchronously synchronize with backend API
    if (targetTicket) {
      apiFetch(`/api/support/tickets/${id}`, {
        method: 'PUT',
        body: {
          response: targetTicket.response,
          status: targetTicket.status,
          history: targetTicket.history,
          updated_at: targetTicket.updated_at,
          resolved_at: targetTicket.resolved_at,
          admin_notes: targetTicket.admin_notes,
        },
      }).catch(() => {});
    }

    return updated;
  },
  createTicket: (ticketData) => {
    const list = adminSupport.getTickets();
    const newId = ticketData.id || `SUP-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTicket = {
      id: newId,
      user_id: ticketData.user_id || 'guest',
      user_name: ticketData.user_name || 'Anonymous User',
      user_email: ticketData.user_email || 'user@example.com',
      user_role: ticketData.user_role || 'learner',
      subject: ticketData.subject || 'Support Inquiry',
      category: ticketData.category || 'General Inquiry',
      priority: ticketData.priority || 'Normal',
      status: ticketData.status || 'Open',
      date: ticketData.date || new Date().toISOString().split('T')[0],
      created_at: ticketData.created_at || new Date().toISOString(),
      description: ticketData.description || '',
      response: ticketData.response || '',
      admin_notes: ticketData.admin_notes || '',
      history: ticketData.history || [
        {
          by: `${ticketData.user_name || 'User'} (${ticketData.user_role || 'user'})`,
          text: 'Ticket opened.',
          time: new Date().toISOString().replace('T', ' ').slice(0, 16),
        },
      ],
    };

    // Insert or update existing
    const existingIdx = list.findIndex((t) => t.id === newId);
    let updated;
    if (existingIdx !== -1) {
      updated = list.map((t) => (t.id === newId ? { ...t, ...newTicket } : t));
    } else {
      updated = [newTicket, ...list];
    }

    adminSupport.saveTickets(updated);
    adminSupport.broadcastUpdate(newId);

    // Asynchronously push to backend API
    apiFetch('/api/support/tickets', { method: 'POST', body: newTicket }).catch(() => {});

    return newTicket;
  },
  deleteTicket: (id) => {
    const list = adminSupport.getTickets();
    const filtered = list.filter((t) => t.id !== id);
    adminSupport.saveTickets(filtered);

    // Also remove from any user-specific storage keys
    try {
      const allKeys = Object.keys(localStorage);
      allKeys.forEach((key) => {
        if (key && key.startsWith('pairup_support_tickets_')) {
          try {
            const raw = localStorage.getItem(key);
            const userList = JSON.parse(raw || '[]');
            if (Array.isArray(userList)) {
              const nextUserList = userList.filter((ut) => ut.id !== id);
              localStorage.setItem(key, JSON.stringify(nextUserList));
            }
          } catch {}
        }
      });
    } catch {}

    adminSupport.broadcastUpdate(id);

    // Asynchronously delete from backend API
    apiFetch(`/api/support/tickets/${id}`, { method: 'DELETE' }).catch(() => {});

    return filtered;
  },
  getUserTickets: (userId, userEmail, role) => {
    const all = adminSupport.getTickets();
    const localIds = new Set();
    try {
      const allKeys = Object.keys(localStorage);
      allKeys.forEach((key) => {
        if (key && key.startsWith('pairup_support_tickets_')) {
          try {
            const raw = localStorage.getItem(key);
            const userList = JSON.parse(raw || '[]');
            if (Array.isArray(userList)) {
              userList.forEach((ut) => ut && ut.id && localIds.add(ut.id));
            }
          } catch {}
        }
      });
    } catch {}

    const targetRole = (role || '').toLowerCase();

    return all.filter((t) => {
      if (!t || !t.id) return false;
      // 1. Any ticket created in this browser
      if (localIds.has(t.id)) return true;
      // 2. Matching user ID
      if (userId && String(t.user_id) === String(userId)) return true;
      // 3. Matching user email
      if (userEmail && t.user_email && t.user_email.toLowerCase() === userEmail.toLowerCase()) return true;
      // 4. Matching portal role (e.g. mentor portal shows mentor tickets, learner portal shows learner tickets)
      if (targetRole && t.user_role && t.user_role.toLowerCase() === targetRole) return true;
      // 5. Guest or unassigned tickets
      if (t.user_id === 'guest' || t.user_id === 'user' || !t.user_role) return true;
      return false;
    });
  },
};

// Automatic sync with backend on script load
if (typeof window !== 'undefined') {
  setTimeout(() => {
    adminSupport.syncWithBackend().catch(() => {});
  }, 100);
}
