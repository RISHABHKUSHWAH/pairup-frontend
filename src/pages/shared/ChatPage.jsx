import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import Modal from '../../components/Modal';
import { api, initials } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { CalendarIcon, UserIcon, MessageIcon, AlertTriangleIcon, CodeIcon, DocumentIcon, PlusIcon, ArrowLeftIcon } from '../../components/Icons';
import { useToast } from '../../context';

export default function ChatPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const rawWith = searchParams.get('with');
  const otherId = (rawWith && rawWith !== 'undefined' && rawWith !== 'null' && rawWith !== 'NaN') ? rawWith : null;
  const rawName = searchParams.get('name');
  const searchName = (rawName && rawName !== 'undefined' && rawName !== 'null') ? rawName : null;

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [activeContract, setActiveContract] = useState(null);
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState('');
  const [loadingConv, setLoadingConv] = useState(true);
  const [partnerProfile, setPartnerProfile] = useState(null);

  // Filters & Tabs
  const [convTab, setConvTab] = useState('all'); // all, active, archived
  const [searchQuery, setSearchQuery] = useState('');
  const [archivedIds, setArchivedIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('pairup_archived_chats') || '[]');
    } catch {
      return [];
    }
  });

  // Code snippet modal
  const [snippetModalOpen, setSnippetModalOpen] = useState(false);
  const [snippetCode, setSnippetCode] = useState('');

  // Schedule Session Modal
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [scheduleTopic, setScheduleTopic] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');

  // Contract Proposal Modal
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [contractForm, setContractForm] = useState({
    title: '',
    description: '',
    technology: 'Full Stack',
    total_sessions: 3,
    session_duration_minutes: 60,
    total_price: 1500,
    topics: ['', '', ''],
  });
  const [submittingContract, setSubmittingContract] = useState(false);

  const messagesContainerRef = useRef(null);
  const isAtBottomRef = useRef(true);

  // Helper to normalize conversation item
  const normalizeConvo = (c) => {
    const uid = c.user_id || c.other_id || c.id;
    const uname = c.name || c.other_name || 'User';
    const urole = c.role || c.other_role || 'learner';
    return {
      ...c,
      user_id: uid,
      other_id: uid,
      name: uname,
      other_name: uname,
      role: urole,
      other_role: urole,
      last_time: c.last_time || (c.last_message_at ? new Date(c.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''),
    };
  };

  // Load conversations list
  useEffect(() => {
    async function loadConversations() {
      try {
        const data = await api.getConversations();
        const list = Array.isArray(data) ? data.map(normalizeConvo) : [];
        setConversations(list);
      } catch (err) {
        console.error('Failed to load conversations:', err);
      } finally {
        setLoadingConv(false);
      }
    }
    loadConversations();
  }, []);

  // If no partner selected in URL but conversations exist, auto-select first conversation
  useEffect(() => {
    if (!otherId && conversations.length > 0 && !loadingConv) {
      const first = conversations[0];
      const pid = first.user_id || first.other_id;
      const pname = first.name || first.other_name || 'User';
      if (pid) {
        setSearchParams({ with: String(pid), name: pname }, { replace: true });
      }
    }
  }, [otherId, conversations, loadingConv]);

  // Find active conversation matching current otherId
  const activeConvo = conversations.find(
    (c) => String(c.user_id || c.other_id) === String(otherId)
  );

  // If otherId is set but name is missing and not in conversation list, try fetching profile
  useEffect(() => {
    if (!otherId) {
      setPartnerProfile(null);
      return;
    }
    if (!activeConvo && !searchName) {
      api.getMentor(otherId)
        .then((m) => {
          if (m?.name) setPartnerProfile({ name: m.name, role: 'mentor' });
        })
        .catch(() => {});
    }
  }, [otherId, activeConvo, searchName]);

  const otherName =
    searchName ||
    activeConvo?.name ||
    activeConvo?.other_name ||
    partnerProfile?.name ||
    'Direct Message';

  const otherRole =
    activeConvo?.role ||
    activeConvo?.other_role ||
    partnerProfile?.role ||
    'user';

  // Keep URL parameters clean and aligned with resolved name
  useEffect(() => {
    if (
      otherId &&
      otherName &&
      otherName !== 'Direct Message' &&
      otherName !== 'undefined' &&
      searchParams.get('name') !== otherName
    ) {
      setSearchParams({ with: String(otherId), name: otherName }, { replace: true });
    }
  }, [otherId, otherName]);

  const scrollToBottom = (behavior = 'auto') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior,
      });
    }
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 60;
  };

  // Reset scroll bottom tracking when active partner changes
  useEffect(() => {
    isAtBottomRef.current = true;
  }, [otherId]);

  // Poll messages every 3.5 seconds when a conversation partner is selected
  useEffect(() => {
    if (!otherId || isNaN(Number(otherId))) return;

    let isMounted = true;

    async function fetchChatData(isInitial = false) {
      try {
        const msgs = await api.getMessages(Number(otherId));
        if (!isMounted) return;

        setMessages((prev) => {
          // Compare if messages changed to avoid unnecessary renders
          const isSame =
            prev.length === msgs.length &&
            (prev.length === 0 || prev[prev.length - 1]?.id === msgs[msgs.length - 1]?.id);

          if (isSame) {
            return prev;
          }

          // If messages changed and user is at bottom or it's initial load, scroll internal container
          setTimeout(() => {
            if (isInitial || isAtBottomRef.current) {
              scrollToBottom(isInitial ? 'auto' : 'smooth');
            }
          }, 60);

          return msgs;
        });

        // Check if there is an active paid booking
        const bookings = await api.getBookings().catch(() => []);
        const active = bookings.find(
          (b) => ['paid', 'accepted', 'pending'].includes(b.status) && (b.learner_id == otherId || b.mentor_id == otherId)
        );
        if (isMounted) setActiveSession(active || null);

        // Check if there is an active contract with this user
        const contracts = await api.getContracts().catch(() => []);
        const activeC = contracts.find(
          (c) => (c.learner_id == otherId || c.mentor_id == otherId) && c.status !== 'declined'
        );
        if (isMounted) setActiveContract(activeC || null);
      } catch (err) {
        // Ignore background polling errors
      }
    }

    fetchChatData(true);
    const interval = setInterval(() => fetchChatData(false), 3500);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [otherId]);

  const handleSend = async (e) => {
    e?.preventDefault();
    const targetId = Number(otherId);
    if (!inputText.trim() || !targetId || isNaN(targetId)) return;

    const textToSend = inputText.trim();
    setInputText('');
    setError('');

    try {
      await api.sendMessage(targetId, textToSend);
      const msgs = await api.getMessages(targetId);
      setMessages(msgs);
      isAtBottomRef.current = true;
      setTimeout(() => scrollToBottom('smooth'), 50);

      // Refresh conversations list in background to update order & preview
      api.getConversations().then((data) => {
        if (Array.isArray(data)) {
          setConversations(data.map(normalizeConvo));
        }
      }).catch(() => {});
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSendSnippet = async (e) => {
    e.preventDefault();
    const targetId = Number(otherId);
    if (!snippetCode.trim() || !targetId || isNaN(targetId)) return;
    const formatted = `\`\`\`\n${snippetCode.trim()}\n\`\`\``;
    setSnippetModalOpen(false);
    setSnippetCode('');
    try {
      await api.sendMessage(targetId, formatted);
      const msgs = await api.getMessages(targetId);
      setMessages(msgs);
      isAtBottomRef.current = true;
      setTimeout(() => scrollToBottom('smooth'), 50);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleToggleArchive = (id) => {
    const numId = Number(id);
    let updated;
    if (archivedIds.includes(numId)) {
      updated = archivedIds.filter((x) => x !== numId);
    } else {
      updated = [...archivedIds, numId];
    }
    setArchivedIds(updated);
    localStorage.setItem('pairup_archived_chats', JSON.stringify(updated));
  };

  const handleScheduleSession = async (e) => {
    e.preventDefault();
    try {
      await api.createBooking({
        mentor_id: Number(otherId),
        topic: scheduleTopic.trim() || 'Pairing Session',
        scheduled_at: scheduleDate,
      });
      toast.success('Session requested! Check My Sessions.');
      setScheduleModalOpen(false);
    } catch (err) {
      toast.error('Could not schedule session: ' + err.message);
    }
  };

  const handleTopicChange = (index, value) => {
    const updated = [...contractForm.topics];
    updated[index] = value;
    setContractForm({ ...contractForm, topics: updated });
  };

  const handleAddTopic = () => {
    setContractForm({ ...contractForm, topics: [...contractForm.topics, ''] });
  };

  const handleRemoveTopic = (index) => {
    if (contractForm.topics.length <= 1) return;
    const updated = contractForm.topics.filter((_, i) => i !== index);
    setContractForm({ ...contractForm, topics: updated });
  };

  const handleProposeContract = async (e) => {
    e.preventDefault();
    if (!otherId) return;

    const validTopics = contractForm.topics.map((t) => t.trim()).filter(Boolean);
    if (validTopics.length === 0) {
      toast.warning('Please specify at least one session topic or milestone.');
      return;
    }

    setSubmittingContract(true);
    try {
      const payload = {
        other_user_id: Number(otherId),
        title: contractForm.title.trim(),
        description: contractForm.description.trim(),
        technology: contractForm.technology.trim(),
        total_sessions: Number(contractForm.total_sessions),
        session_duration_minutes: Number(contractForm.session_duration_minutes),
        total_price: Number(contractForm.total_price),
        topics: validTopics,
      };

      const created = await api.createContract(payload);

      try {
        await api.sendMessage(
          Number(otherId),
          `📋 Proposed a Mentorship Contract: "${contractForm.title.trim()}" (${contractForm.total_sessions} sessions, ₹${contractForm.total_price}). View milestones & details in the Contract Hub!`
        );
        const msgs = await api.getMessages(otherId);
        setMessages(msgs);
        isAtBottomRef.current = true;
        setTimeout(() => scrollToBottom('smooth'), 50);
      } catch (chatErr) {
        console.warn('Chat notification error:', chatErr);
      }

      setActiveContract(created);
      setContractModalOpen(false);
      setContractForm({
        title: '',
        description: '',
        technology: 'Full Stack',
        total_sessions: 3,
        session_duration_minutes: 60,
        total_price: 1500,
        topics: ['', '', ''],
      });
      toast.success('Mentorship contract proposal sent successfully!');
    } catch (err) {
      toast.error('Could not propose contract: ' + (err.message || 'Unknown error'));
    } finally {
      setSubmittingContract(false);
    }
  };


  // Filter conversations
  const filteredConversations = conversations.filter((c) => {
    const pid = c.user_id || c.other_id;
    const isArchived = archivedIds.includes(Number(pid));
    if (convTab === 'archived' && !isArchived) return false;
    if (convTab === 'active' && isArchived) return false;
    if (convTab === 'all' && isArchived) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const pName = c.name || c.other_name || '';
      return pName.toLowerCase().includes(q) || (c.last_message || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main className="container" style={{ flex: 1, paddingTop: '16px', paddingBottom: '30px' }}>
        <div style={{ marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button
            type="button"
            onClick={() => {
              if (window.history.state && window.history.state.idx > 0) {
                navigate(-1);
              } else {
                navigate(user?.role === 'mentor' ? '/mentor/dashboard' : user?.role === 'admin' ? '/admin/dashboard' : '/learner/dashboard');
              }
            }}
            className="portal-back-btn"
            title="Go back to previous page"
            aria-label="Go back to previous page"
          >
            <ArrowLeftIcon size={15} />
            <span>Back to Dashboard</span>
          </button>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '280px 1fr',
            gap: '20px',
            height: 'calc(100vh - 150px)',
            minHeight: '520px',
          }}
        >
          {/* Left Column: Conversations List */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--grid-strong)',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--grid-strong)' }}>
              <div style={{ fontWeight: 700, fontSize: '15px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <MessageIcon size={16} /> Conversations
              </div>
              <input
                type="text"
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--grid-strong)',
                  fontSize: '12px',
                  background: 'var(--bg)',
                  color: 'var(--ink)',
                }}
              />
            </div>

            {/* Tabs: All / Active / Archived */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--grid-strong)', background: 'var(--bg)' }}>
              {['all', 'active', 'archived'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setConvTab(t)}
                  style={{
                    flex: 1,
                    padding: '8px 4px',
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'capitalize',
                    border: 'none',
                    background: convTab === t ? 'var(--surface)' : 'transparent',
                    color: convTab === t ? 'var(--ink)' : 'var(--ink-muted)',
                    cursor: 'pointer',
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '6px' }}>
              {loadingConv ? (
                <p className="sub" style={{ padding: '12px', fontSize: '12px' }}>Loading conversations...</p>
              ) : filteredConversations.length === 0 && !otherId ? (
                <p className="sub" style={{ padding: '12px', fontSize: '12px' }}>No {convTab} chats found.</p>
              ) : (
                filteredConversations.map((c) => {
                  const partnerId = c.user_id || c.other_id;
                  const partnerName = c.name || c.other_name || 'User';
                  const isSelected = String(otherId) === String(partnerId);

                  return (
                    <div
                      key={partnerId}
                      onClick={() => setSearchParams({ with: String(partnerId), name: partnerName })}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        background: isSelected ? 'var(--accent-soft)' : 'transparent',
                        border: isSelected ? '1px solid var(--grid-strong)' : '1px solid transparent',
                        marginBottom: '3px',
                        transition: 'background 0.15s ease',
                      }}
                    >
                      <div className="avatar" style={{ width: '36px', height: '36px', fontSize: '13px', flexShrink: 0 }}>
                        {initials(partnerName)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                          <span style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--ink)' }}>{partnerName}</span>
                          <span className="mono" style={{ fontSize: '10px', color: 'var(--ink-faint)' }}>
                            {c.last_time || ''}
                          </span>
                        </div>
                        <div
                          className="sub"
                          style={{
                            margin: 0,
                            fontSize: '11.5px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            color: isSelected ? 'var(--ink)' : 'var(--ink-muted)',
                          }}
                        >
                          {c.last_message || 'Direct conversation'}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Chat Window */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--grid-strong)',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {otherId ? (
              <>
                {/* Chat Header */}
                <div
                  style={{
                    padding: '12px 18px',
                    borderBottom: '1px solid var(--grid-strong)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                  }}
                >
                  <div className="avatar" style={{ width: '38px', height: '38px', fontSize: '14px', flexShrink: 0 }}>
                    {initials(otherName)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px' }}>{otherName}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--add)' }}>
                      <span className="status online">
                        <span className="led"></span>
                        Active on PairUp
                      </span>
                    </div>
                  </div>

                  <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ fontSize: '11.5px', padding: '5px 12px' }}
                      onClick={() => {
                        setScheduleModalOpen(true);
                        setScheduleDate(new Date(Date.now() + 86400000).toISOString().slice(0, 16));
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <CalendarIcon size={13} /> Schedule Session
                      </span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ fontSize: '11.5px', padding: '5px 12px' }}
                      onClick={() => setContractModalOpen(true)}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                        <DocumentIcon size={13} /> Propose Contract
                      </span>
                    </button>
                    {(otherRole === 'mentor' || user?.role === 'learner') && (
                      <Link
                        to={`/mentor/${otherId}`}
                        className="btn btn-ghost"
                        style={{ fontSize: '11.5px', padding: '5px 10px' }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <UserIcon size={13} /> Profile
                        </span>
                      </Link>
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: '11.5px', padding: '5px 8px' }}
                      onClick={() => handleToggleArchive(otherId)}
                      title={archivedIds.includes(Number(otherId)) ? 'Unarchive chat' : 'Archive chat'}
                    >
                      {archivedIds.includes(Number(otherId)) ? 'Unarchive' : 'Archive'}
                    </button>
                  </div>
                </div>

                {/* Active Contract Banner */}
                {activeContract && (
                  <div
                    style={{
                      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.08) 100%)',
                      borderBottom: '1px solid var(--grid-strong)',
                      padding: '10px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: 'var(--accent)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <DocumentIcon size={16} />
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--ink)' }}>
                            {activeContract.title}
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '2px 7px',
                              borderRadius: '10px',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              background:
                                activeContract.status === 'active'
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : activeContract.status === 'completed'
                                  ? 'rgba(59, 130, 246, 0.15)'
                                  : activeContract.status === 'disputed'
                                  ? 'rgba(239, 68, 68, 0.15)'
                                  : 'rgba(245, 158, 11, 0.15)',
                              color:
                                activeContract.status === 'active'
                                  ? '#10b981'
                                  : activeContract.status === 'completed'
                                  ? '#3b82f6'
                                  : activeContract.status === 'disputed'
                                  ? '#ef4444'
                                  : '#f59e0b',
                            }}
                          >
                            {activeContract.status?.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <div style={{ fontSize: '11.5px', color: 'var(--ink-muted)', marginTop: '2px' }}>
                          <span>{activeContract.technology}</span>
                          <span style={{ margin: '0 6px' }}>•</span>
                          <span>
                            {activeContract.completed_sessions || 0} of {activeContract.total_sessions} Sessions Done
                          </span>
                          <span style={{ margin: '0 6px' }}>•</span>
                          <strong style={{ color: 'var(--ink)' }}>₹{activeContract.total_price}</strong>
                          {activeContract.escrow_status && (
                            <span style={{ marginLeft: '6px', fontSize: '10.5px', opacity: 0.85 }}>
                              (Escrow: {activeContract.escrow_status})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      {activeContract.status === 'proposed' && user?.role === 'learner' && (
                        <Link
                          to={`/contracts/${activeContract.id}`}
                          className="btn btn-primary"
                          style={{ fontSize: '11px', padding: '5px 12px' }}
                        >
                          Review &amp; Fund Escrow →
                        </Link>
                      )}
                      {activeContract.status === 'completed_by_mentor' && user?.role === 'learner' && (
                        <Link
                          to={`/contracts/${activeContract.id}`}
                          className="btn btn-primary"
                          style={{ fontSize: '11px', padding: '5px 12px', background: 'var(--add)' }}
                        >
                          Approve &amp; Release Payout →
                        </Link>
                      )}
                      <Link
                        to={`/contracts/${activeContract.id}`}
                        className="btn btn-ghost"
                        style={{ fontSize: '11px', padding: '5px 10px' }}
                      >
                        Contract Hub ↗
                      </Link>
                    </div>
                  </div>
                )}


                {/* Session Information Banner */}
                {activeSession && (
                  <div
                    style={{
                      background: 'var(--accent-soft)',
                      borderBottom: '1px solid var(--grid-strong)',
                      padding: '10px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '240px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: 'var(--accent)',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <CalendarIcon size={16} />
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '13px', color: 'var(--ink)' }}>
                            Active Session
                          </span>
                          <span
                            style={{
                              fontSize: '10px',
                              padding: '2px 7px',
                              borderRadius: '10px',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              background:
                                activeSession.status === 'paid' || activeSession.status === 'confirmed'
                                  ? 'rgba(16, 185, 129, 0.15)'
                                  : activeSession.status === 'completed'
                                  ? 'rgba(59, 130, 246, 0.15)'
                                  : 'rgba(245, 158, 11, 0.15)',
                              color:
                                activeSession.status === 'paid' || activeSession.status === 'confirmed'
                                  ? '#10b981'
                                  : activeSession.status === 'completed'
                                  ? '#3b82f6'
                                  : '#f59e0b',
                            }}
                          >
                            {activeSession.status}
                          </span>
                        </div>
                        <div
                          style={{
                            fontSize: '11.5px',
                            color: 'var(--ink-muted)',
                            marginTop: '2px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '480px',
                          }}
                          title={activeSession.topic || 'Pairing Session'}
                        >
                          {activeSession.topic || 'Pairing Session'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                      {activeSession.status === 'paid' ? (
                        <Link
                          to={`/session?booking_id=${activeSession.id}`}
                          className="btn btn-primary"
                          style={{ fontSize: '12px', padding: '6px 14px', whiteSpace: 'nowrap' }}
                        >
                          Enter Session Room →
                        </Link>
                      ) : (
                        <Link
                          to="/learner/sessions"
                          className="btn btn-ghost"
                          style={{ fontSize: '12px', padding: '6px 14px', whiteSpace: 'nowrap' }}
                        >
                          Session Details →
                        </Link>
                      )}
                    </div>
                  </div>
                )}

                {/* Message Stream */}
                <div
                  ref={messagesContainerRef}
                  onScroll={handleScroll}
                  style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}
                >
                  {messages.length === 0 ? (
                    <div className="empty" style={{ margin: 'auto' }}>
                      <p>Start a conversation with {otherName}!</p>
                    </div>
                  ) : (
                    messages.map((m) => {
                      const isMine = m.sender_id === user?.id;
                      return (
                        <div
                          key={m.id}
                          className={`bubble ${isMine ? 'bubble-mine' : 'bubble-theirs'}`}
                          style={{
                            maxWidth: '75%',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            fontFamily: m.body.startsWith('```') ? 'monospace' : 'inherit',
                          }}
                        >
                          {m.body}
                          <div
                            style={{
                              fontSize: '9.5px',
                              opacity: 0.7,
                              textAlign: 'right',
                              marginTop: '4px',
                            }}
                          >
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Error Box (e.g. Anti-leak rejection) */}
                {error && (
                  <div className="error-box" style={{ margin: '0 16px 8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertTriangleIcon size={14} /> {error}
                  </div>
                )}

                {/* Input Bar */}
                <form
                  onSubmit={handleSend}
                  style={{
                    display: 'flex',
                    gap: '8px',
                    padding: '12px 16px',
                    borderTop: '1px solid var(--grid-strong)',
                    background: 'var(--bg)',
                    alignItems: 'center',
                  }}
                >
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: '8px 10px', display: 'inline-flex', alignItems: 'center' }}
                    onClick={() => setSnippetModalOpen(true)}
                    title="Send Code Snippet"
                  >
                    <CodeIcon size={16} />
                  </button>
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    placeholder={`Message ${otherName}...`}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--grid-strong)',
                      fontSize: '13.5px',
                      background: 'var(--surface)',
                      color: 'var(--ink)',
                    }}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: '10px 18px' }}>
                    Send
                  </button>
                </form>
              </>
            ) : (
              <div className="empty" style={{ margin: 'auto' }}>
                <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: '8px', color: 'var(--muted)' }}>
                  <MessageIcon size={36} />
                </div>
                <h3>Select a conversation</h3>
                <p className="sub" style={{ fontSize: '13px' }}>
                  Choose a mentor from the list or explore mentors to start chatting.
                </p>
                <Link to="/learner/explore" className="btn btn-primary" style={{ marginTop: '8px' }}>
                  Explore Mentors
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Code Snippet Modal */}
      <Modal
        isOpen={snippetModalOpen}
        onClose={() => setSnippetModalOpen(false)}
        title="Share Code Snippet"
      >
        <form onSubmit={handleSendSnippet}>
          <div className="field">
            <label>Paste formatted code</label>
            <textarea
              value={snippetCode}
              onChange={(e) => setSnippetCode(e.target.value)}
              placeholder="Paste code or configuration here..."
              rows={6}
              style={{ fontFamily: 'monospace', fontSize: '12.5px' }}
              required
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '14px' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setSnippetModalOpen(false)}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              Send Snippet
            </button>
          </div>
        </form>
      </Modal>

      {/* Schedule Session Modal */}
      <Modal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        title={`Schedule Session with ${otherName}`}
      >
        <form onSubmit={handleScheduleSession}>
          <div className="field">
            <label>Session Topic &amp; Goal</label>
            <input
              type="text"
              value={scheduleTopic}
              onChange={(e) => setScheduleTopic(e.target.value)}
              placeholder="e.g. Architecture review of payment microservice"
              required
            />
          </div>
          <div className="field">
            <label>Date &amp; Time</label>
            <input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
              required
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setScheduleModalOpen(false)}
              style={{ flex: 1 }}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
              Request Session
            </button>
          </div>
        </form>
      </Modal>

      {/* Propose Contract Modal */}
      <Modal
        isOpen={contractModalOpen}
        onClose={() => setContractModalOpen(false)}
        title={`Propose Mentorship Contract with ${otherName}`}
      >
        <form onSubmit={handleProposeContract}>

          <div className="field">
            <label>Contract Title</label>
            <input
              type="text"
              value={contractForm.title}
              onChange={(e) => setContractForm({ ...contractForm, title: e.target.value })}
              placeholder="e.g. Master Full-Stack Development with React & Django"
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="field">
              <label>Technology Stack</label>
              <input
                type="text"
                value={contractForm.technology}
                onChange={(e) => setContractForm({ ...contractForm, technology: e.target.value })}
                placeholder="e.g. React, Django, PostgreSQL"
                required
              />
            </div>
            <div className="field">
              <label>Total Price (₹)</label>
              <input
                type="number"
                min="100"
                step="50"
                value={contractForm.total_price}
                onChange={(e) => setContractForm({ ...contractForm, total_price: e.target.value })}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="field">
              <label>Number of Sessions</label>
              <input
                type="number"
                min="1"
                max="50"
                value={contractForm.total_sessions}
                onChange={(e) => setContractForm({ ...contractForm, total_sessions: e.target.value })}
                required
              />
            </div>
            <div className="field">
              <label>Minutes / Session</label>
              <input
                type="number"
                min="15"
                step="15"
                value={contractForm.session_duration_minutes}
                onChange={(e) => setContractForm({ ...contractForm, session_duration_minutes: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="field">
            <label>Objectives &amp; Scope</label>
            <textarea
              rows={3}
              value={contractForm.description}
              onChange={(e) => setContractForm({ ...contractForm, description: e.target.value })}
              placeholder="Outline what will be built, key milestones, and mentorship outcomes..."
              required
            />
          </div>

          <div className="field" style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label style={{ margin: 0 }}>Milestone Topics ({contractForm.topics.length})</label>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={handleAddTopic}
                style={{ fontSize: '11px', padding: '2px 8px' }}
              >
                + Add Topic
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '180px', overflowY: 'auto' }}>
              {contractForm.topics.map((topic, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <span className="mono" style={{ fontSize: '11px', color: 'var(--ink-muted)', width: '22px' }}>
                    #{idx + 1}
                  </span>
                  <input
                    type="text"
                    value={topic}
                    onChange={(e) => handleTopicChange(idx, e.target.value)}
                    placeholder={`Milestone topic ${idx + 1} (e.g. Database modeling)`}
                    style={{ flex: 1, padding: '7px 10px', fontSize: '12.5px' }}
                    required
                  />
                  {contractForm.topics.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={() => handleRemoveTopic(idx)}
                      style={{ padding: '4px 8px', color: 'var(--del)', fontSize: '14px' }}
                      title="Remove Topic"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              background: 'var(--accent-soft)',
              fontSize: '12px',
              marginTop: '14px',
              color: 'var(--ink)',
            }}
          >
            🛡️ <strong>Platform Escrow Guarantee:</strong> Payment is securely held in platform escrow until all {contractForm.total_sessions} sessions are delivered and approved by the learner.
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setContractModalOpen(false)}
              style={{ flex: 1 }}
              disabled={submittingContract}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{ flex: 1 }}
              disabled={submittingContract}
            >
              {submittingContract ? 'Sending...' : 'Propose Contract'}
            </button>
          </div>
        </form>
      </Modal>

      <Footer />

    </div>
  );
}
