/**
 * Mentor LocalStorage Services
 */

export const mentorSavedProblems = {
  getSaved: () => {
    try {
      return JSON.parse(localStorage.getItem('pairup_mentor_saved_problems') || '[]');
    } catch {
      return [];
    }
  },
  isSaved: (problemId) => {
    const list = mentorSavedProblems.getSaved();
    return list.some((p) => p.id === problemId);
  },
  toggleSaved: (problem) => {
    let list = mentorSavedProblems.getSaved();
    const exists = list.some((p) => p.id === problem.id);
    if (exists) {
      list = list.filter((p) => p.id !== problem.id);
    } else {
      list.push(problem);
    }
    localStorage.setItem('pairup_mentor_saved_problems', JSON.stringify(list));
    return list;
  },
};

export const mentorCalendarSettings = {
  getBlockedDates: () => {
    try {
      return JSON.parse(localStorage.getItem('pairup_mentor_blocked_dates') || '[]');
    } catch {
      return [];
    }
  },
  addBlockedDate: (blockItem) => {
    const list = mentorCalendarSettings.getBlockedDates();
    const item = { id: Date.now(), ...blockItem };
    const updated = [...list, item];
    localStorage.setItem('pairup_mentor_blocked_dates', JSON.stringify(updated));
    return updated;
  },
  removeBlockedDate: (id) => {
    let list = mentorCalendarSettings.getBlockedDates().filter((b) => b.id !== id);
    localStorage.setItem('pairup_mentor_blocked_dates', JSON.stringify(list));
    return list;
  },
  getBufferTime: () => {
    try {
      return Number(localStorage.getItem('pairup_mentor_buffer_time') || 15);
    } catch {
      return 15;
    }
  },
  setBufferTime: (mins) => {
    localStorage.setItem('pairup_mentor_buffer_time', String(mins));
    return mins;
  },
  getCalendarSync: () => {
    try {
      return JSON.parse(localStorage.getItem('pairup_mentor_calendar_sync') || '{"google": true, "apple": false}');
    } catch {
      return { google: true, apple: false };
    }
  },
  setCalendarSync: (data) => {
    localStorage.setItem('pairup_mentor_calendar_sync', JSON.stringify(data));
    return data;
  },
  getTimezone: () => {
    try {
      return localStorage.getItem('pairup_mentor_timezone') || 'Asia/Kolkata';
    } catch {
      return 'Asia/Kolkata';
    }
  },
  setTimezone: (tz) => {
    localStorage.setItem('pairup_mentor_timezone', String(tz));
    return tz;
  },
  getDurations: () => {
    try {
      return JSON.parse(localStorage.getItem('pairup_mentor_durations') || '[30, 60, 90]');
    } catch {
      return [30, 60, 90];
    }
  },
  setDurations: (durs) => {
    localStorage.setItem('pairup_mentor_durations', JSON.stringify(durs));
    return durs;
  },
};

export const mentorPayoutSettings = {
  getPayoutMethod: (user) => {
    const key = user?.id ? `pairup_mentor_payout_method_${user.id}` : 'pairup_mentor_payout_method';
    try {
      const data = localStorage.getItem(key);
      if (data) return JSON.parse(data);
    } catch {}

    // Demo account fallback for Alex Rivera
    if (user?.email === 'alex@example.com') {
      return {
        type: 'bank',
        bankName: 'HDFC Bank',
        accountNumber: '••••••••4819',
        ifsc: 'HDFC0001234',
        holderName: 'Alex Rivera',
        upiId: 'alex@okhdfcbank',
        pan: 'ABCDE1234F',
        payoutSchedule: 'weekly',
      };
    }

    // Blank default for newly registered mentors
    return {
      type: 'bank',
      bankName: '',
      accountNumber: '',
      ifsc: '',
      holderName: user?.name || '',
      upiId: '',
      pan: '',
      payoutSchedule: 'weekly',
    };
  },
  savePayoutMethod: (data, userId) => {
    const key = userId ? `pairup_mentor_payout_method_${userId}` : 'pairup_mentor_payout_method';
    localStorage.setItem(key, JSON.stringify(data));
    return data;
  },
};

export const mentorProfileSettings = {
  getDefault: (user) => {
    // Demo account fallback for Alex Rivera
    if (user?.email === 'alex@example.com' || user?.email === 'alex.mentor@pairup.dev') {
      return {
        name: user?.name || 'Alex Rivera',
        email: user?.email || 'alex@example.com',
        headline: 'Senior Full-Stack & Cloud Architect | Ex-Staff Engineer',
        bio: 'Passionate about distributed systems, Python microservices, and React performance. Helped 50+ engineers level up and debug complex production bottlenecks.',
        location: 'Bengaluru, India',
        languages: ['English', 'Hindi'],
        skills: ['Python', 'Django', 'FastAPI', 'React', 'Docker', 'AWS', 'PostgreSQL', 'System Design'],
        primaryTech: 'Python & Cloud Architecture',
        yearsExperience: 7,
        certifications: [
          { id: 'cert_1', title: 'AWS Certified Solutions Architect - Professional', issuer: 'Amazon Web Services', year: '2023' },
          { id: 'cert_2', title: 'Google Cloud Professional Cloud Architect', issuer: 'Google Cloud', year: '2022' },
        ],
        githubUrl: 'https://github.com/alexrivera-dev',
        portfolioUrl: 'https://alexrivera.tech',
        workHistory: [
          { id: 'work_1', role: 'Staff Software Engineer', company: 'TechFlow Inc.', duration: '2022 - Present', description: 'Architecting high-throughput event processing pipelines serving 50M+ requests/day.' },
          { id: 'work_2', role: 'Senior Backend Engineer', company: 'StartupHub Labs', duration: '2019 - 2022', description: 'Led cloud migration to AWS Kubernetes and optimized PostgreSQL query latencies by 60%.' },
        ],
        sessionTypes: [
          { id: '1on1', name: '1-on-1 Mentorship', active: true, price: 800, desc: 'Career guidance, architectural discussions, mock interviews' },
          { id: 'code_review', name: 'Code Review & Architecture', active: true, price: 1000, desc: 'Deep dive into PRs, codebase audits, and security best practices' },
          { id: 'bug_fixing', name: 'Live Bug Solving & Pairing', active: true, price: 1200, desc: 'Pair programming on active bugs, stack traces, and production issues' },
        ],
        hourlyRate: 1000,
        durationOptions: [30, 60, 90],
        weeklyHours: 15,
        isVerified: true,
        idVerified: true,
        proVerified: true,
        rating: 4.9,
        reviewCount: 14,
        sessionsCompleted: 14,
        memberSince: 'March 2024',
      };
    }

    // Fresh, clean profile for newly registered mentors
    return {
      name: user?.name || '',
      email: user?.email || '',
      headline: '',
      bio: '',
      location: '',
      languages: ['English'],
      skills: [],
      primaryTech: '',
      yearsExperience: 0,
      certifications: [],
      githubUrl: '',
      portfolioUrl: '',
      workHistory: [],
      sessionTypes: [
        { id: '1on1', name: '1-on-1 Mentorship', active: true, price: 500, desc: 'Career guidance, architectural discussions, mock interviews' },
        { id: 'code_review', name: 'Code Review & Architecture', active: true, price: 800, desc: 'Deep dive into PRs, codebase audits, and security best practices' },
        { id: 'bug_fixing', name: 'Live Bug Solving & Pairing', active: true, price: 1000, desc: 'Pair programming on active bugs, stack traces, and production issues' },
      ],
      hourlyRate: 500,
      durationOptions: [30, 60],
      weeklyHours: 10,
      isVerified: false,
      idVerified: false,
      proVerified: false,
      rating: 0,
      reviewCount: 0,
      sessionsCompleted: 0,
      memberSince: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
    };
  },
  getProfile: (user) => {
    const key = user?.id ? `pairup_mentor_profile_${user.id}` : 'pairup_mentor_profile';
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (user?.name && (!parsed.name || parsed.name === 'Alex Rivera')) parsed.name = user.name;
        if (user?.email && (!parsed.email || parsed.email === 'alex.mentor@pairup.dev')) parsed.email = user.email;
        return parsed;
      }
    } catch {}
    const def = mentorProfileSettings.getDefault(user);
    if (user?.id) localStorage.setItem(key, JSON.stringify(def));
    return def;
  },
  saveProfile: (data, userId) => {
    const key = userId ? `pairup_mentor_profile_${userId}` : 'pairup_mentor_profile';
    localStorage.setItem(key, JSON.stringify(data));
    return data;
  },
};

export const mentorNotifications = {
  getDefaults: () => [
    {
      id: 1,
      type: 'problem',
      title: 'New Problem Matching Your Skills',
      body: 'A learner posted: Django REST Framework JWT authentication blocker. Budget: ₹1,200.',
      time: '15m ago',
      read: false,
      link: '/mentor/explore-problems',
    },
    {
      id: 2,
      type: 'proposal',
      title: 'Proposal Accepted! 🎉',
      body: "Your proposal for 'React state synchronization bug' was accepted. Booking created in Sessions.",
      time: '2h ago',
      read: false,
      link: '/mentor/sessions',
    },
    {
      id: 3,
      type: 'payment',
      title: 'Payment Released to Your Balance',
      body: '₹1,500 has been released from escrow for completed session with Sarah Connor.',
      time: '1d ago',
      read: true,
      link: '/mentor/earnings',
    },
    {
      id: 4,
      type: 'review',
      title: 'New 5★ Rating Received!',
      body: "Sarah Connor left a 5-star review: 'Outstanding mentor! Fixed our backend query issue in under 30 mins.'",
      time: '2d ago',
      read: true,
      link: '/mentor/reviews',
    },
  ],
  getNotifications: () => {
    try {
      const stored = localStorage.getItem('pairup_mentor_notifications');
      if (stored) return JSON.parse(stored);
    } catch {}
    const defaults = mentorNotifications.getDefaults();
    localStorage.setItem('pairup_mentor_notifications', JSON.stringify(defaults));
    return defaults;
  },
  markRead: (id) => {
    const list = mentorNotifications.getNotifications().map((n) => (n.id === id ? { ...n, read: true } : n));
    localStorage.setItem('pairup_mentor_notifications', JSON.stringify(list));
    return list;
  },
  markAllRead: () => {
    const list = mentorNotifications.getNotifications().map((n) => ({ ...n, read: true }));
    localStorage.setItem('pairup_mentor_notifications', JSON.stringify(list));
    return list;
  },
  clearAll: () => {
    localStorage.setItem('pairup_mentor_notifications', JSON.stringify([]));
    return [];
  },
  addNotification: (item) => {
    const list = mentorNotifications.getNotifications();
    const newItem = { id: Date.now(), time: 'Just now', read: false, ...item };
    const updated = [newItem, ...list];
    localStorage.setItem('pairup_mentor_notifications', JSON.stringify(updated));
    return updated;
  },
};
