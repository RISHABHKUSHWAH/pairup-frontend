/**
 * Learner LocalStorage Services
 */

export const learnerFavorites = {
  getFavorites: () => {
    try {
      return JSON.parse(localStorage.getItem('pairup_learner_favorites') || '[]');
    } catch {
      return [];
    }
  },
  isFavorite: (mentorId) => {
    const list = learnerFavorites.getFavorites();
    return list.some((m) => m.id === mentorId || m.user_id === mentorId);
  },
  toggleFavorite: (mentor) => {
    let list = learnerFavorites.getFavorites();
    const id = mentor.id || mentor.user_id;
    const exists = list.some((m) => (m.id || m.user_id) === id);
    if (exists) {
      list = list.filter((m) => (m.id || m.user_id) !== id);
    } else {
      list.push(mentor);
    }
    localStorage.setItem('pairup_learner_favorites', JSON.stringify(list));
    return list;
  },
};

export const learnerProfile = {
  getProfile: (defaultUser) => {
    const key = defaultUser?.id ? `pairup_learner_profile_${defaultUser.id}` : 'pairup_learner_profile';
    try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null');
      if (saved) {
        if (defaultUser?.name && (!saved.name || saved.name === 'Jane Doe')) saved.name = defaultUser.name;
        if (defaultUser?.email && (!saved.email || saved.email === 'learner@example.com')) saved.email = defaultUser.email;
        return saved;
      }
    } catch {}

    // Demo account profile for seeded learner
    if (defaultUser?.email === 'sarah@example.com') {
      return {
        name: defaultUser?.name || 'Sarah Connor',
        headline: 'Full-Stack Developer learning Python & Cloud Architecture',
        email: defaultUser?.email || 'sarah@example.com',
        phone: '+91 98765 43210',
        phoneVerified: true,
        emailVerified: true,
        location: 'Bengaluru, India',
        timezone: 'Asia/Kolkata (IST, UTC+5:30)',
        skillsLearning: ['Python', 'Django', 'Docker', 'AWS', 'PostgreSQL'],
        skillLevel: 'Intermediate',
        learningGoals: 'Master building scalable distributed backends with Python & Django. Prepare for senior developer technical interviews.',
        currentRole: 'Software Engineer',
        organization: 'TechFlow Inc.',
        githubUrl: 'https://github.com',
        linkedinUrl: 'https://linkedin.com',
        portfolioUrl: 'https://github.com',
        learningStyle: 'Hands-on Coding & Pair Programming',
        preferredLanguage: 'English',
      };
    }

    // Fresh profile for newly registered learners
    return {
      name: defaultUser?.name || '',
      headline: '',
      email: defaultUser?.email || '',
      phone: '',
      phoneVerified: false,
      emailVerified: true,
      location: '',
      timezone: 'Asia/Kolkata (IST, UTC+5:30)',
      skillsLearning: [],
      skillLevel: 'Beginner',
      learningGoals: '',
      currentRole: '',
      organization: '',
      githubUrl: '',
      linkedinUrl: '',
      portfolioUrl: '',
      learningStyle: 'Hands-on Coding & Pair Programming',
      preferredLanguage: 'English',
    };
  },
  saveProfile: (data, userId) => {
    const key = userId ? `pairup_learner_profile_${userId}` : 'pairup_learner_profile';
    localStorage.setItem(key, JSON.stringify(data));
    return data;
  },
};

export const learnerNotifications = {
  getDefaults: () => [
    {
      id: 1,
      type: 'proposal',
      title: 'New proposal received',
      body: 'Alex Rivera submitted a proposal for "Django migration failing with IntegrityError" (₹1,500 / 45 mins)',
      time: '15 minutes ago',
      read: false,
      link: '/learner/my-problems',
    },
    {
      id: 2,
      type: 'session',
      title: 'Upcoming session reminder',
      body: 'Pairing session with Sarah Chen starts today at 4:30 PM (IST). Topic: React Query State Management',
      time: '1 hour ago',
      read: false,
      link: '/learner/sessions',
    },
    {
      id: 3,
      type: 'message',
      title: 'New message from David Patel',
      body: 'David: "I pushed the updated schema sample for you to review before our call!"',
      time: '3 hours ago',
      read: false,
      link: '/chat',
    },
    {
      id: 4,
      type: 'payment',
      title: 'Escrow payment secured',
      body: 'Payment of ₹2,500 held safely in escrow for booking #104. Funds will only be released after your confirmation.',
      time: 'Yesterday',
      read: true,
      link: '/learner/payments',
    },
    {
      id: 5,
      type: 'review',
      title: 'Leave a review for Michael Scott',
      body: 'Your pairing session on "AWS Lambda Deployment" concluded. Help the community by sharing your feedback!',
      time: '2 days ago',
      read: true,
      link: '/learner/reviews',
    },
    {
      id: 6,
      type: 'refund',
      title: 'Dispute update',
      body: 'Admin resolved dispute #12 with full refund of ₹1,800 credited to your wallet balance.',
      time: '3 days ago',
      read: true,
      link: '/learner/payments',
    },
  ],
  getNotifications: () => {
    try {
      const stored = localStorage.getItem('pairup_learner_notifications');
      if (stored) return JSON.parse(stored);
    } catch {}
    const defaults = learnerNotifications.getDefaults();
    localStorage.setItem('pairup_learner_notifications', JSON.stringify(defaults));
    return defaults;
  },
  markRead: (id) => {
    const list = learnerNotifications.getNotifications().map((n) => (n.id === id ? { ...n, read: true } : n));
    localStorage.setItem('pairup_learner_notifications', JSON.stringify(list));
    return list;
  },
  markAllRead: () => {
    const list = learnerNotifications.getNotifications().map((n) => ({ ...n, read: true }));
    localStorage.setItem('pairup_learner_notifications', JSON.stringify(list));
    return list;
  },
  clearAll: () => {
    localStorage.setItem('pairup_learner_notifications', JSON.stringify([]));
    return [];
  },
  addNotification: (item) => {
    const list = learnerNotifications.getNotifications();
    const newItem = { id: Date.now(), time: 'Just now', read: false, ...item };
    const updated = [newItem, ...list];
    localStorage.setItem('pairup_learner_notifications', JSON.stringify(updated));
    return updated;
  },
};

export const learnerBilling = {
  getDefaultCards: () => [
    { id: 'card_1', brand: 'Visa', last4: '4242', exp: '12/28', isDefault: true, holder: 'Jane Doe' },
    { id: 'card_2', brand: 'Mastercard', last4: '8812', exp: '08/27', isDefault: false, holder: 'Jane Doe' },
  ],
  getCards: () => {
    try {
      const stored = localStorage.getItem('pairup_learner_cards');
      if (stored) return JSON.parse(stored);
    } catch {}
    const cards = learnerBilling.getDefaultCards();
    localStorage.setItem('pairup_learner_cards', JSON.stringify(cards));
    return cards;
  },
  addCard: (card) => {
    const cards = learnerBilling.getCards();
    const newCard = {
      id: 'card_' + Date.now(),
      brand: card.brand || 'Visa',
      last4: card.number ? card.number.slice(-4) : '1234',
      exp: card.exp || '12/29',
      isDefault: cards.length === 0,
      holder: card.holder || 'Cardholder',
    };
    const updated = [...cards, newCard];
    localStorage.setItem('pairup_learner_cards', JSON.stringify(updated));
    return updated;
  },
  removeCard: (id) => {
    let cards = learnerBilling.getCards().filter((c) => c.id !== id);
    if (cards.length > 0 && !cards.some((c) => c.isDefault)) {
      cards[0].isDefault = true;
    }
    localStorage.setItem('pairup_learner_cards', JSON.stringify(cards));
    return cards;
  },
  setDefaultCard: (id) => {
    const cards = learnerBilling.getCards().map((c) => ({
      ...c,
      isDefault: c.id === id,
    }));
    localStorage.setItem('pairup_learner_cards', JSON.stringify(cards));
    return cards;
  },
  getWalletBalance: () => {
    try {
      const bal = localStorage.getItem('pairup_learner_wallet');
      return bal !== null ? Number(bal) : 3200;
    } catch {
      return 3200;
    }
  },
  topupWallet: (amount) => {
    const current = learnerBilling.getWalletBalance();
    const next = current + Number(amount);
    localStorage.setItem('pairup_learner_wallet', String(next));
    return next;
  },
  getBillingDetails: () => {
    try {
      const data = localStorage.getItem('pairup_learner_billing_info');
      if (data) return JSON.parse(data);
    } catch {}
    return {
      fullName: 'Jane Doe',
      company: 'TechCorp Labs',
      email: 'billing@janedoe.dev',
      address: '742 Evergreen Terrace, Sector 4',
      city: 'Bengaluru',
      state: 'Karnataka',
      pin: '560100',
      country: 'India',
      taxId: '29ABCDE1234F1Z5',
    };
  },
  saveBillingDetails: (data) => {
    localStorage.setItem('pairup_learner_billing_info', JSON.stringify(data));
    return data;
  },
};

export const learnerDrafts = {
  saveProblemDraft: (draft) => {
    localStorage.setItem('pairup_problem_draft', JSON.stringify(draft));
  },
  getProblemDraft: () => {
    try {
      return JSON.parse(localStorage.getItem('pairup_problem_draft') || 'null');
    } catch {
      return null;
    }
  },
  clearProblemDraft: () => {
    localStorage.removeItem('pairup_problem_draft');
  },
};
