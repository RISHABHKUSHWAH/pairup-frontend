import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import PortalLayout from '../../components/PortalLayout';
import Modal from '../../components/Modal';
import BookSessionModal from '../../components/BookSessionModal';
import { api, initials } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  CalendarIcon,
  UserIcon,
  UsersIcon,
  MessageIcon,
  AlertTriangleIcon,
  CodeIcon,
  DocumentIcon,
  PlusIcon,
  ArrowLeftIcon,
  SendIcon,
  PaperclipIcon,
  SmileIcon,
  ReplyIcon,
  EyeIcon,
  DownloadIcon,
  TrashIcon,
  MoreHorizontalIcon,
  ArchiveIcon,
} from '../../components/Icons';
import { formatChatDayDate, isSameDay } from '../../utils/formatters';
import { useToast } from '../../context';

const formatPreviewText = (text) => {
  if (!text) return '';
  let str = String(text);
  str = str.replace(/\[Attachment:\s*([^\]|]+)(?:\|[^\]]+)?\]/g, '📎 $1');
  const lines = str.split('\n');
  const nonQuote = lines.filter((l) => !l.trim().startsWith('>')).join(' ').trim();
  if (nonQuote) return nonQuote;
  return str.replace(/(?:^|\s)>+\s*(@[^:]+:\s*)?/g, '').trim();
};

export default function ChatPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();

  const rawWith = searchParams.get('with');
  const otherId = (rawWith && rawWith !== 'undefined' && rawWith !== 'null' && rawWith !== 'NaN') ? rawWith : null;
  const rawName = searchParams.get('name');
  const searchName = (rawName && rawName !== 'undefined' && rawName !== 'null') ? rawName : null;
  const rawContract = searchParams.get('contract');
  const searchContractId = (rawContract && rawContract !== 'undefined' && rawContract !== 'null' && rawContract !== 'NaN') ? rawContract : null;

  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [activeContract, setActiveContract] = useState(null);
  const [dismissedContractId, setDismissedContractId] = useState(null);
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

  // Formatting, emojis, and reply
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null); // { id, senderName, text, targetPartnerId, targetContractId }
  const [highlightedMsgId, setHighlightedMsgId] = useState(null);
  const highlightTimeoutRef = useRef(null);
  const draftsRef = useRef({});
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const quickEmojis = ['👍', '👋', '❤️', '🔥', '😊', '🎉', '💻', '🚀', '💡', '✅', '🙏', '💯'];

  // Header More Options Dropdown (...)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setMoreMenuOpen(false);
      }
    };
    if (moreMenuOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [moreMenuOpen]);

  const activeConvoKey = otherId ? `${otherId}_${searchContractId || 'general'}` : '';

  const handleInputChange = (val) => {
    setInputText(val);
    if (activeConvoKey) {
      draftsRef.current[activeConvoKey] = val;
    }
  };

  const applyFormatting = (prefix, suffix = prefix) => {
    const el = inputRef.current;
    if (!el) {
      const updated = inputText ? `${inputText} ${prefix}text${suffix} ` : `${prefix}text${suffix}`;
      handleInputChange(updated);
      return;
    }

    const start = el.selectionStart ?? inputText.length;
    const end = el.selectionEnd ?? inputText.length;
    const selected = inputText.substring(start, end);

    let newText = '';
    let newCursor = 0;

    if (selected) {
      newText = inputText.substring(0, start) + prefix + selected + suffix + inputText.substring(end);
      newCursor = start + prefix.length + selected.length + suffix.length;
    } else {
      const placeholder = prefix === '```' ? '\n// paste code here\n' : 'text';
      newText = inputText.substring(0, start) + prefix + placeholder + suffix + inputText.substring(end);
      newCursor = start + prefix.length + placeholder.length;
    }

    handleInputChange(newText);
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(newCursor, newCursor);
      }
    }, 0);
  };

  const handleStartReply = (msg, authorName) => {
    const rawBody = msg.body || '';
    // Strip leading blockquotes so replies don't chain nested quotes
    const cleanedBody = rawBody
      .split('\n')
      .filter((line) => !line.trim().startsWith('>'))
      .join(' ')
      .trim();

    setReplyingTo({
      id: msg.id,
      senderName: authorName,
      text: cleanedBody || rawBody.replace(/(?:^|\s)>+\s*(@[^:]+:\s*)?/g, '').trim(),
      targetPartnerId: String(otherId),
      targetContractId: String(searchContractId || ''),
    });
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  // File attachments state & handlers
  const [previewAttachment, setPreviewAttachment] = useState(null); // { name, url, isImage }
  const [uploadingFile, setUploadingFile] = useState(false);

  const handleViewAttachment = (fileName, fileUrl) => {
    const isImage = /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(fileName);
    const resolvedUrl = fileUrl || `/api/messages/attachment/view?name=${encodeURIComponent(fileName)}`;
    setPreviewAttachment({
      name: fileName,
      url: resolvedUrl,
      isImage,
    });
  };

  const handleDownloadAttachment = async (fileName, fileUrl) => {
    try {
      toast.info(`Preparing download for ${fileName}...`);
      const targetUrl = `/api/messages/attachment/download?name=${encodeURIComponent(fileName)}` + (fileUrl ? `&url=${encodeURIComponent(fileUrl)}` : '');
      const token = localStorage.getItem('token') || localStorage.getItem('pairup_token');
      const res = await fetch(targetUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      toast.success(`Downloaded ${fileName}`);
    } catch (err) {
      // Fallback direct browser download
      window.open(`/api/messages/attachment/download?name=${encodeURIComponent(fileName)}` + (fileUrl ? `&url=${encodeURIComponent(fileUrl)}` : ''), '_blank');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 25 * 1024 * 1024) {
      toast.error('File exceeds 25MB maximum limit.');
      e.target.value = '';
      return;
    }
    setUploadingFile(true);
    toast.info(`Uploading ${file.name}...`);
    try {
      const res = await api.uploadAttachment(file);
      const attachmentTag = `[Attachment: ${res.filename || file.name}|${res.url}]`;
      const updated = `${inputText ? inputText + ' ' : ''}${attachmentTag}`;
      handleInputChange(updated);
      toast.success(`Attached file: ${file.name}`);
    } catch (err) {
      console.error('Attachment upload failed:', err);
      const fallbackTag = `[Attachment: ${file.name}]`;
      const updated = `${inputText ? inputText + ' ' : ''}${fallbackTag}`;
      handleInputChange(updated);
      toast.info(`Attached file reference: ${file.name}`);
    } finally {
      setUploadingFile(false);
      e.target.value = '';
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

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

  // Delete Chat & Delete Message State
  const [chatToDelete, setChatToDelete] = useState(null); // { partnerId, contractId, name }
  const [messageToDelete, setMessageToDelete] = useState(null); // id
  const [deletingChat, setDeletingChat] = useState(false);

  const handleConfirmDeleteChat = async () => {
    if (!chatToDelete) return;
    const { partnerId, contractId, name } = chatToDelete;
    setDeletingChat(true);
    try {
      await api.clearConversation(partnerId, contractId);
      toast.success(`Chat with ${name} deleted from your side`);

      const isCurrent = String(otherId) === String(partnerId) && String(searchContractId || '') === String(contractId || '');
      if (isCurrent) {
        setMessages([]);
      }

      const data = await api.getConversations();
      const updatedList = Array.isArray(data) ? data.map(normalizeConvo) : [];
      setConversations(updatedList);

      if (isCurrent) {
        if (updatedList.length > 0) {
          const first = updatedList[0];
          const pid = first.user_id || first.other_id;
          const pname = first.name || first.other_name || 'User';
          const nextParams = { with: String(pid), name: pname };
          if (first.contract_id) nextParams.contract = String(first.contract_id);
          setSearchParams(nextParams);
        } else {
          setSearchParams({});
        }
      }
    } catch (err) {
      toast.error('Failed to delete chat: ' + (err.message || 'Server error'));
    } finally {
      setDeletingChat(false);
      setChatToDelete(null);
    }
  };

  const handleConfirmDeleteMessage = async (deleteFor = 'me') => {
    if (!messageToDelete) return;
    const msgId = typeof messageToDelete === 'object' ? messageToDelete.id : messageToDelete;
    try {
      await api.deleteMessage(msgId, deleteFor);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
      if (replyingTo?.id === msgId) {
        setReplyingTo(null);
      }
      toast.success(deleteFor === 'everyone' ? 'Message deleted for everyone' : 'Message deleted for you');
      api.getConversations().then((data) => {
        if (Array.isArray(data)) setConversations(data.map(normalizeConvo));
      }).catch(() => {});
    } catch (err) {
      toast.error('Failed to delete message: ' + (err.message || 'Server error'));
    } finally {
      setMessageToDelete(null);
    }
  };

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
        const nextParams = { with: String(pid), name: pname };
        if (first.contract_id) nextParams.contract = String(first.contract_id);
        setSearchParams(nextParams, { replace: true });
      }
    }
  }, [otherId, conversations, loadingConv]);

  // Find active conversation matching current otherId and contractId
  const activeConvo = conversations.find(
    (c) => String(c.user_id || c.other_id) === String(otherId) && String(c.contract_id || null) === String(searchContractId || null)
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
      const nextParams = { with: String(otherId), name: otherName };
      if (searchContractId) nextParams.contract = String(searchContractId);
      setSearchParams(nextParams, { replace: true });
    }
  }, [otherId, otherName, searchContractId]);

  const scrollToBottom = (behavior = 'auto') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior,
      });
    }
  };

  const scrollToMessage = (targetMsgId) => {
    if (!targetMsgId) return;
    const el = document.getElementById(`chat-msg-${targetMsgId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMsgId(targetMsgId);
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
      highlightTimeoutRef.current = setTimeout(() => {
        setHighlightedMsgId(null);
      }, 2500);
    } else {
      toast.info('Referenced message could not be found in current chat');
    }
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    isAtBottomRef.current = scrollHeight - scrollTop - clientHeight < 60;
  };

  // Reset scroll bottom tracking, clear replies/errors/emoji/dismissals, and restore per-chat draft when conversation changes
  useEffect(() => {
    setReplyingTo(null);
    setError('');
    setEmojiPickerOpen(false);
    setDismissedContractId(null);
    setMoreMenuOpen(false);
    isAtBottomRef.current = true;
    const savedDraft = activeConvoKey ? draftsRef.current[activeConvoKey] || '' : '';
    setInputText(savedDraft);
  }, [otherId, searchContractId, activeConvoKey]);

  // Poll messages every 3.5 seconds when a conversation partner is selected
  useEffect(() => {
    setMessages([]);
    if (!otherId || isNaN(Number(otherId))) return;

    let isMounted = true;

    async function fetchChatData(isInitial = false) {
      try {
        const msgs = await api.getMessages(Number(otherId), searchContractId);
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

        // Check if there is an actionable contract with this user (proposed, active, or pending release; NEVER disputed, completed, or declined)
        const contracts = await api.getContracts().catch(() => []);
        const activeC = contracts.find(
          (c) =>
            (Number(c.learner_id) === Number(otherId) || Number(c.mentor_id) === Number(otherId)) &&
            ['proposed', 'active', 'completed_by_mentor'].includes(c.status)
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
  }, [otherId, searchContractId]);

  const handleSend = async (e) => {
    e?.preventDefault();
    const targetId = Number(otherId);
    if (!inputText.trim() || !targetId || isNaN(targetId)) return;

    let textToSend = inputText.trim();
    if (
      replyingTo &&
      String(replyingTo.targetPartnerId) === String(otherId) &&
      String(replyingTo.targetContractId || '') === String(searchContractId || '')
    ) {
      const cleanSnippet = (replyingTo.text || '').replace(/\n+/g, ' ').slice(0, 80);
      textToSend = `> [#${replyingTo.id}] @${replyingTo.senderName}: ${cleanSnippet}\n${textToSend}`;
    }
    setReplyingTo(null);

    setInputText('');
    if (activeConvoKey) {
      delete draftsRef.current[activeConvoKey];
    }
    setError('');

    try {
      await api.sendMessage(targetId, textToSend, searchContractId);
      const msgs = await api.getMessages(targetId, searchContractId);
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
    let formatted = `\`\`\`\n${snippetCode.trim()}\n\`\`\``;
    if (
      replyingTo &&
      String(replyingTo.targetPartnerId) === String(otherId) &&
      String(replyingTo.targetContractId || '') === String(searchContractId || '')
    ) {
      const cleanSnippet = (replyingTo.text || '').replace(/\n+/g, ' ').slice(0, 80);
      formatted = `> [#${replyingTo.id}] @${replyingTo.senderName}: ${cleanSnippet}\n${formatted}`;
    }
    setReplyingTo(null);

    setSnippetModalOpen(false);
    setSnippetCode('');
    try {
      await api.sendMessage(targetId, formatted, searchContractId);
      const msgs = await api.getMessages(targetId, searchContractId);
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
        duration_minutes: 60,
        price: 50,
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

  const handleQuoteClick = (quoteText, explicitId, currentIdx) => {
    // 1. If explicit message ID is present and exists in messages
    if (explicitId) {
      const exists = messages.some((m) => m.id === explicitId);
      if (exists) {
        scrollToMessage(explicitId);
        return;
      }
    }

    if (!quoteText) return;

    // 2. Parse quote text: e.g. "@Sarah Connor: hello sir" or "@Alex Rivera: 🎉"
    let targetAuthor = null;
    let targetSnippet = quoteText;
    const authorMatch = quoteText.match(/^@([^:]+):\s*([\s\S]*)$/);
    if (authorMatch) {
      targetAuthor = authorMatch[1].trim().toLowerCase();
      targetSnippet = authorMatch[2].trim();
    }

    const cleanSnippet = targetSnippet.toLowerCase().trim();
    if (!cleanSnippet && !targetAuthor) return;

    // 3. Search backwards before current message index first, then across all messages
    let foundMsg = null;
    const startIdx = typeof currentIdx === 'number' && currentIdx > 0 ? currentIdx - 1 : messages.length - 1;

    // Pass 1: Look backwards before current message for matching author AND matching text
    for (let i = startIdx; i >= 0; i--) {
      const cand = messages[i];
      const candBody = formatPreviewText(cand.body).toLowerCase();
      const isMine = String(cand.sender_id) === String(user?.id);
      const candAuthor = (isMine ? (user?.name || 'You') : otherName).toLowerCase();

      const authorMatches = !targetAuthor || candAuthor.includes(targetAuthor) || targetAuthor.includes(candAuthor);
      const textMatches = cleanSnippet && (candBody.includes(cleanSnippet) || cleanSnippet.includes(candBody));

      if (authorMatches && textMatches) {
        foundMsg = cand;
        break;
      }
    }

    // Pass 2: If not found, look backwards for just matching text
    if (!foundMsg && cleanSnippet) {
      for (let i = startIdx; i >= 0; i--) {
        const cand = messages[i];
        const candBody = formatPreviewText(cand.body).toLowerCase();
        if (candBody.includes(cleanSnippet) || cleanSnippet.includes(candBody)) {
          foundMsg = cand;
          break;
        }
      }
    }

    // Pass 3: Search all other messages
    if (!foundMsg && cleanSnippet) {
      for (let i = messages.length - 1; i >= 0; i--) {
        if (i === currentIdx) continue;
        const cand = messages[i];
        const candBody = formatPreviewText(cand.body).toLowerCase();
        if (candBody.includes(cleanSnippet) || cleanSnippet.includes(candBody)) {
          foundMsg = cand;
          break;
        }
      }
    }

    if (foundMsg) {
      scrollToMessage(foundMsg.id);
    } else {
      toast.info('Original message could not be found in current conversation');
    }
  };

  const renderFormattedMessage = (text, currentMsg = null, msgIndex = null) => {
    if (!text) return null;

    let quote = null;
    let mainText = text;
    if (text.startsWith('> ')) {
      const firstNewline = text.indexOf('\n');
      if (firstNewline !== -1) {
        quote = text.slice(2, firstNewline).trim();
        mainText = text.slice(firstNewline + 1).trim();
      } else {
        quote = text.slice(2).trim();
        mainText = '';
      }
    }

    let targetMsgIdFromQuote = null;
    let displayQuote = quote;
    if (quote) {
      // Check for encoded message id: [#123] or [reply:123]
      const idMatch = quote.match(/\[#(?:msg-)?(\d+)\]|\[reply:(\d+)\]/i);
      if (idMatch) {
        targetMsgIdFromQuote = Number(idMatch[1] || idMatch[2]);
      }
      // Clean any historical nested quotes like "> @Sarah Connor: " or "[#123] " inside the quote text
      displayQuote = quote
        .replace(/\[#(?:msg-)?\d+\]|\[reply:\d+\]/gi, '')
        .replace(/(?:^|\s)>+\s*(@[^:]+:\s*)?/g, ' ')
        .trim();
    }

    const codeBlockRegex = /```(?:[a-zA-Z0-9_-]+)?\n?([\s\S]*?)```/g;
    const parts = [];
    let lastIdx = 0;
    let match;

    while ((match = codeBlockRegex.exec(mainText)) !== null) {
      if (match.index > lastIdx) {
        parts.push({ type: 'text', content: mainText.substring(lastIdx, match.index) });
      }
      parts.push({ type: 'code', content: match[1] });
      lastIdx = match.index + match[0].length;
    }
    if (lastIdx < mainText.length) {
      parts.push({ type: 'text', content: mainText.substring(lastIdx) });
    }

    const renderInline = (str) => {
      if (!str) return null;
      const attachRegex = /\[Attachment:\s*([^\]]+)\]/g;
      const segments = [];
      let cur = 0;
      let aMatch;
      while ((aMatch = attachRegex.exec(str)) !== null) {
        if (aMatch.index > cur) {
          segments.push(str.substring(cur, aMatch.index));
        }
        const rawContent = aMatch[1].trim();
        let fileName = rawContent;
        let fileUrl = null;
        if (rawContent.includes('|')) {
          const parts = rawContent.split('|');
          fileName = parts[0].trim();
          fileUrl = parts[1].trim();
        }

        const isImage = /\.(png|jpe?g|gif|webp|svg|bmp)$/i.test(fileName);
        const viewUrl = fileUrl || `/api/messages/attachment/view?name=${encodeURIComponent(fileName)}`;

        segments.push(
          <div
            key={`att-${aMatch.index}`}
            className="chat-attachment-card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              padding: '10px 12px',
              borderRadius: '10px',
              background: 'var(--surface)',
              border: '1px solid var(--grid-strong)',
              margin: '6px 0',
              maxWidth: '380px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
            }}
          >
            {isImage && (
              <div
                onClick={() => handleViewAttachment(fileName, viewUrl)}
                style={{
                  borderRadius: '6px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  background: 'rgba(0, 0, 0, 0.2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  maxHeight: '180px',
                  position: 'relative',
                }}
                title="Click to preview image"
              >
                <img
                  src={viewUrl}
                  alt={fileName}
                  style={{
                    maxHeight: '180px',
                    maxWidth: '100%',
                    objectFit: 'contain',
                    display: 'block',
                    borderRadius: '4px',
                  }}
                  onError={(e) => {
                    if (!e.target.src.includes('/api/messages/attachment/view')) {
                      e.target.src = `/api/messages/attachment/view?name=${encodeURIComponent(fileName)}`;
                    }
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                <PaperclipIcon size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <span
                  style={{
                    fontSize: '12.5px',
                    fontWeight: 600,
                    color: 'var(--ink)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                  title={fileName}
                >
                  {fileName}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => handleViewAttachment(fileName, viewUrl)}
                  className="btn btn-ghost"
                  style={{
                    padding: '3px 8px',
                    fontSize: '11px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    height: '26px',
                    lineHeight: 1,
                  }}
                  title="View attachment"
                >
                  <EyeIcon size={12} /> View
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadAttachment(fileName, viewUrl)}
                  className="btn btn-primary"
                  style={{
                    padding: '3px 9px',
                    fontSize: '11px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    height: '26px',
                    lineHeight: 1,
                  }}
                  title="Download file"
                >
                  <DownloadIcon size={12} /> Download
                </button>
              </div>
            </div>
          </div>
        );
        cur = aMatch.index + aMatch[0].length;
      }
      if (cur < str.length) {
        segments.push(str.substring(cur));
      }

      return segments.map((seg, sIdx) => {
        if (typeof seg !== 'string') return seg;

        const inlineRegex = /(\*\*[^*]+\*\*|\*[^*]+\*|~~[^~]+~~|`[^`]+`)/g;
        const inlineParts = seg.split(inlineRegex);

        return (
          <span key={sIdx}>
            {inlineParts.map((sub, iIdx) => {
              if (sub.startsWith('**') && sub.endsWith('**') && sub.length > 4) {
                return <strong key={iIdx}>{sub.slice(2, -2)}</strong>;
              }
              if (sub.startsWith('*') && sub.endsWith('*') && sub.length > 2) {
                return <em key={iIdx}>{sub.slice(1, -1)}</em>;
              }
              if (sub.startsWith('~~') && sub.endsWith('~~') && sub.length > 4) {
                return <del key={iIdx}>{sub.slice(2, -2)}</del>;
              }
              if (sub.startsWith('`') && sub.endsWith('`') && sub.length > 2) {
                return (
                  <code
                    key={iIdx}
                    style={{
                      background: 'rgba(255,255,255,0.08)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '12px',
                      color: '#93c5fd',
                    }}
                  >
                    {sub.slice(1, -1)}
                  </code>
                );
              }
              return sub;
            })}
          </span>
        );
      });
    };

    return (
      <div>
        {displayQuote && (
          <div
            className="chat-quote-badge"
            onClick={(e) => {
              e.stopPropagation();
              handleQuoteClick(displayQuote, targetMsgIdFromQuote, msgIndex);
            }}
            title="Click to jump to original message"
            style={{
              borderLeft: '3px solid var(--accent)',
              padding: '4px 10px',
              marginBottom: '6px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '0 6px 6px 0',
              fontSize: '12px',
              color: 'var(--ink-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <ReplyIcon size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>
              {displayQuote}
            </span>
            <span
              style={{
                fontSize: '10.5px',
                color: 'var(--accent)',
                opacity: 0.9,
                fontWeight: 600,
                flexShrink: 0,
                marginLeft: '4px',
                padding: '1px 5px',
                borderRadius: '4px',
                background: 'rgba(38, 71, 214, 0.12)',
              }}
            >
              Jump ↗
            </span>
          </div>
        )}

        {parts.length === 0 && mainText ? renderInline(mainText) : null}

        {parts.map((p, pIdx) => {
          if (p.type === 'code') {
            return (
              <pre
                key={pIdx}
                style={{
                  background: 'rgba(0, 0, 0, 0.35)',
                  border: '1px solid var(--grid-strong)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '12.5px',
                  overflowX: 'auto',
                  margin: '6px 0',
                  color: '#6ee7b7',
                  lineHeight: 1.45,
                }}
              >
                <code>{p.content}</code>
              </pre>
            );
          }
          return <div key={pIdx}>{renderInline(p.content)}</div>;
        })}
      </div>
    );
  };

  return (
    <PortalLayout title="Messages" portalType={user?.role || 'learner'} showBack={true} fullHeight={true}>
        <div
          className="chat-page-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '320px 1fr',
            gap: '16px',
            flex: 1,
            height: '100%',
            minHeight: 0,
            overflow: 'hidden',
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
              height: '100%',
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--grid-strong)', flexShrink: 0 }}>
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
            <div style={{ display: 'flex', borderBottom: '1px solid var(--grid-strong)', background: 'var(--bg)', flexShrink: 0 }}>
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

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '6px' }}>
              {loadingConv ? (
                <p className="sub" style={{ padding: '12px', fontSize: '12px' }}>Loading conversations...</p>
              ) : filteredConversations.length === 0 && !otherId ? (
                <p className="sub" style={{ padding: '12px', fontSize: '12px' }}>No {convTab} chats found.</p>
              ) : (
                filteredConversations.map((c) => {
                  const partnerId = c.user_id || c.other_id;
                  const displayName = c.contract_title || c.name || c.other_name || 'User';
                  const partnerName = c.name || c.other_name || 'User';
                  
                  const isSelected = String(otherId) === String(partnerId) && String(c.contract_id || null) === String(searchContractId || null);

                  return (
                    <div
                      key={`${partnerId}_${c.contract_id || 'general'}`}
                      onClick={() => {
                        setReplyingTo(null);
                        setError('');
                        setEmojiPickerOpen(false);
                        const newParams = { with: String(partnerId), name: partnerName };
                        if (c.contract_id) newParams.contract = String(c.contract_id);
                        setSearchParams(newParams);
                      }}
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
                      <div className="avatar" style={{ width: '36px', height: '36px', fontSize: '13px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {c.contract_id ? <UsersIcon size={18} /> : initials(displayName)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                          <span style={{ fontWeight: 600, fontSize: '13.5px', color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <span className="mono" style={{ fontSize: '10px', color: 'var(--ink-faint)' }}>
                              {c.last_time || ''}
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setChatToDelete({
                                  partnerId,
                                  contractId: c.contract_id || null,
                                  name: displayName,
                                });
                              }}
                              className="chat-delete-convo-btn"
                              title={`Delete conversation with ${displayName}`}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--ink-faint)',
                                cursor: 'pointer',
                                padding: '2px 4px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: '4px',
                                transition: 'color 0.15s ease',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--red, #ef4444)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ink-faint)'; }}
                            >
                              <TrashIcon size={12} />
                            </button>
                          </div>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--ink-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {c.last_message_mine ? <span style={{ opacity: 0.6 }}>You: </span> : ''}
                          {formatPreviewText(c.last_message)}
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
              height: '100%',
              minHeight: 0,
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
                    flexShrink: 0,
                  }}
                >
                  <div className="avatar" style={{ width: '38px', height: '38px', fontSize: '14px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {searchContractId ? <UsersIcon size={20} /> : initials(otherName)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {searchContractId && activeConvo?.contract_title ? activeConvo.contract_title : otherName}
                      {searchContractId && (
                        <span style={{ fontSize: '10px', background: 'var(--accent-soft)', color: 'var(--accent)', padding: '2px 6px', borderRadius: '4px', whiteSpace: 'nowrap' }}>
                          Contract #{searchContractId}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--add)' }}>
                      {searchContractId && activeConvo?.contract_title && (
                        <span style={{ color: 'var(--ink-muted)', marginRight: '4px' }}>
                          with {otherName} •
                        </span>
                      )}
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
                    {!searchContractId && (
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
                    )}
                    {/* More Options Dropdown (...) */}
                    <div style={{ position: 'relative' }} ref={moreMenuRef}>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{
                          padding: '5px 9px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '6px',
                          background: moreMenuOpen ? 'var(--surface-hover)' : 'transparent',
                        }}
                        onClick={() => setMoreMenuOpen((prev) => !prev)}
                        title="More options"
                        aria-label="More options"
                      >
                        <MoreHorizontalIcon size={18} />
                      </button>

                      {moreMenuOpen && (
                        <div
                          style={{
                            position: 'absolute',
                            top: 'calc(100% + 6px)',
                            right: 0,
                            minWidth: '160px',
                            background: 'var(--surface)',
                            border: '1px solid var(--grid-strong)',
                            borderRadius: '8px',
                            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
                            zIndex: 100,
                            padding: '5px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '2px',
                          }}
                        >
                          {(otherRole === 'mentor' || user?.role === 'learner') && (
                            <Link
                              to={`/mentor/${otherId}`}
                              onClick={() => setMoreMenuOpen(false)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '7px 10px',
                                borderRadius: '6px',
                                fontSize: '12.5px',
                                color: 'var(--ink)',
                                textDecoration: 'none',
                                cursor: 'pointer',
                                transition: 'background 0.15s ease',
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                            >
                              <UserIcon size={14} style={{ color: 'var(--ink-muted)' }} />
                              <span>Profile</span>
                            </Link>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              handleToggleArchive(otherId);
                              setMoreMenuOpen(false);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '7px 10px',
                              borderRadius: '6px',
                              fontSize: '12.5px',
                              color: 'var(--ink)',
                              background: 'transparent',
                              border: 'none',
                              width: '100%',
                              textAlign: 'left',
                              cursor: 'pointer',
                              transition: 'background 0.15s ease',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surface-hover)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                          >
                            <ArchiveIcon size={14} style={{ color: 'var(--ink-muted)' }} />
                            <span>{archivedIds.includes(Number(otherId)) ? 'Unarchive' : 'Archive'}</span>
                          </button>

                          <div style={{ height: '1px', background: 'var(--grid-strong)', margin: '3px 0' }} />

                          <button
                            type="button"
                            onClick={() => {
                              setMoreMenuOpen(false);
                              const displayName = searchContractId && activeConvo?.contract_title
                                ? `${activeConvo.contract_title} (Contract)`
                                : otherName;
                              setChatToDelete({
                                partnerId: otherId,
                                contractId: searchContractId || null,
                                name: displayName,
                              });
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '7px 10px',
                              borderRadius: '6px',
                              fontSize: '12.5px',
                              color: 'var(--red, #ef4444)',
                              background: 'transparent',
                              border: 'none',
                              width: '100%',
                              textAlign: 'left',
                              cursor: 'pointer',
                              transition: 'background 0.15s ease',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                          >
                            <TrashIcon size={14} />
                            <span>Delete Chat</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Active Contract Banner */}
                {!searchContractId && activeContract && dismissedContractId !== activeContract.id && (
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
                      flexShrink: 0,
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
                                  : activeContract.status === 'completed_by_mentor'
                                  ? 'rgba(59, 130, 246, 0.15)'
                                  : 'rgba(245, 158, 11, 0.15)',
                              color:
                                activeContract.status === 'active'
                                  ? '#10b981'
                                  : activeContract.status === 'completed_by_mentor'
                                  ? '#3b82f6'
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
                      <button
                        type="button"
                        onClick={() => setDismissedContractId(activeContract.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--ink-muted)',
                          fontSize: '14px',
                          padding: '2px 6px',
                          lineHeight: 1,
                          borderRadius: '4px',
                        }}
                        title="Dismiss banner"
                      >
                        ✕
                      </button>
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
                      flexShrink: 0,
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
                  style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '8px' }}
                >
                  {messages.length === 0 ? (
                    <div className="empty" style={{ margin: 'auto' }}>
                      <p>Start a conversation with {otherName}!</p>
                    </div>
                  ) : (
                    messages.map((m, idx) => {
                      const isMine = String(m.sender_id) === String(user?.id);
                      const prevMsg = idx > 0 ? messages[idx - 1] : null;
                      const showDateDivider = !prevMsg || !isSameDay(m.created_at, prevMsg.created_at);
                      const senderDisplayName = isMine ? (user?.name || 'You') : otherName;
                      const isHighlighted = highlightedMsgId === m.id;

                      return (
                        <React.Fragment key={m.id || idx}>
                          {/* Day & Date Separator Header */}
                          {showDateDivider && m.created_at && (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px',
                                margin: idx === 0 ? '6px 0 12px' : '18px 0 12px',
                                userSelect: 'none',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: '12px',
                                  fontWeight: 600,
                                  color: 'var(--ink-muted)',
                                  whiteSpace: 'nowrap',
                                  letterSpacing: '0.01em',
                                }}
                              >
                                {formatChatDayDate(m.created_at)}
                              </span>
                              <div style={{ flex: 1, height: '1px', background: 'var(--grid-strong)' }} />
                            </div>
                          )}

                          {/* Message Item */}
                          <div
                            id={`chat-msg-${m.id}`}
                            style={{
                              display: 'flex',
                              gap: '12px',
                              padding: '8px 12px',
                              borderRadius: '8px',
                              background: isHighlighted
                                ? 'rgba(38, 71, 214, 0.22)'
                                : isMine
                                ? 'rgba(38, 75, 228, 0.07)'
                                : 'transparent',
                              border: isHighlighted
                                ? '1px solid var(--accent)'
                                : isMine
                                ? '1px solid rgba(38, 75, 228, 0.15)'
                                : '1px solid transparent',
                              transition: 'all 0.25s ease',
                            }}
                            className={`chat-message-row ${isHighlighted ? 'chat-message-highlighted' : ''}`}
                          >
                            <div
                              className="avatar"
                              style={{
                                width: '34px',
                                height: '34px',
                                fontSize: '12.5px',
                                flexShrink: 0,
                                background: isMine ? 'var(--accent)' : 'var(--surface-hover, #232733)',
                                color: '#fff',
                                fontWeight: 700,
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginTop: '2px',
                              }}
                            >
                              {initials(senderDisplayName)}
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px' }}>
                                <span style={{ fontWeight: 700, fontSize: '13.5px', color: isMine ? 'var(--accent)' : 'var(--ink)' }}>
                                  {senderDisplayName}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--ink-faint)' }}>
                                  {m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <button
                                    type="button"
                                    onClick={() => handleStartReply(m, senderDisplayName)}
                                    className="chat-reply-btn"
                                    title="Reply to this message"
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: 'var(--ink-muted)',
                                      cursor: 'pointer',
                                      fontSize: '11.5px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                    }}
                                  >
                                    <ReplyIcon size={12} />
                                    <span>Reply</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setMessageToDelete(m)}
                                    className="chat-delete-msg-btn"
                                    title="Delete message"
                                    style={{
                                      background: 'transparent',
                                      border: 'none',
                                      color: 'var(--ink-faint)',
                                      cursor: 'pointer',
                                      fontSize: '11.5px',
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      transition: 'color 0.15s ease',
                                    }}
                                    onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--red, #ef4444)'; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ink-faint)'; }}
                                  >
                                    <TrashIcon size={12} />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </div>

                              <div
                                style={{
                                  fontSize: '13.5px',
                                  color: 'var(--ink)',
                                  lineHeight: '1.55',
                                  wordBreak: 'break-word',
                                }}
                              >
                                {renderFormattedMessage(m.body, m, idx)}
                              </div>
                            </div>
                          </div>
                        </React.Fragment>
                      );
                    })
                  )}
                </div>

                {/* Error Box (e.g. Anti-leak rejection) */}
                {error && (
                  <div className="error-box" style={{ margin: '0 16px 8px', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <AlertTriangleIcon size={14} /> {error}
                  </div>
                )}

                {/* Rich Input Bar with Formatting Toolbar */}
                <div
                  style={{
                    borderTop: '1px solid var(--grid-strong)',
                    background: 'var(--bg)',
                    padding: '10px 14px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    flexShrink: 0,
                    position: 'relative',
                  }}
                >
                  {/* Hidden file input */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />

                  {/* Emoji picker popup */}
                  {emojiPickerOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: '14px',
                        marginBottom: '8px',
                        background: 'var(--surface)',
                        border: '1px solid var(--grid-strong)',
                        borderRadius: '10px',
                        padding: '8px 10px',
                        display: 'flex',
                        gap: '6px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                        zIndex: 50,
                      }}
                    >
                      {quickEmojis.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            const updated = (inputText || '') + emoji;
                            handleInputChange(updated);
                            setEmojiPickerOpen(false);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            fontSize: '18px',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '6px',
                            lineHeight: 1,
                          }}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Replying Preview Banner */}
                  {replyingTo &&
                    String(replyingTo.targetPartnerId) === String(otherId) &&
                    String(replyingTo.targetContractId || '') === String(searchContractId || '') && (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 12px',
                        background: 'var(--accent-soft)',
                        borderLeft: '3px solid var(--accent)',
                        borderRadius: '6px',
                        fontSize: '12px',
                        cursor: 'pointer',
                        userSelect: 'none',
                        transition: 'background 0.15s ease',
                      }}
                      onClick={() => scrollToMessage(replyingTo.id)}
                      title="Click to view message being replied to"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                        <ReplyIcon size={14} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                        <span style={{ fontWeight: 600, color: 'var(--accent)' }}>
                          Replying to {replyingTo.senderName}:
                        </span>
                        <span
                          style={{
                            color: 'var(--ink-muted)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '360px',
                          }}
                        >
                          {replyingTo.text}
                        </span>
                        <span
                          style={{
                            fontSize: '10.5px',
                            color: 'var(--accent)',
                            fontWeight: 600,
                            padding: '1px 5px',
                            borderRadius: '4px',
                            background: 'rgba(38, 71, 214, 0.12)',
                          }}
                        >
                          View ↗
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReplyingTo(null);
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--ink-muted)',
                          fontSize: '13px',
                          padding: '0 4px',
                        }}
                        title="Cancel reply"
                      >
                        ✕
                      </button>
                    </div>
                  )}

                  {/* Message Text Input Form */}
                  <form onSubmit={handleSend} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input
                      ref={inputRef}
                      type="text"
                      value={inputText}
                      onChange={(e) => handleInputChange(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Escape' && replyingTo) {
                          setReplyingTo(null);
                        }
                      }}
                      placeholder="Send a message..."
                      style={{
                        flex: 1,
                        padding: '11px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--grid-strong)',
                        fontSize: '13.5px',
                        background: 'var(--surface)',
                        color: 'var(--ink)',
                      }}
                    />
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{
                        padding: '10px 18px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontWeight: 600,
                      }}
                    >
                      <span>Send</span>
                      <SendIcon size={15} />
                    </button>
                  </form>

                  {/* Formatting & Action Toolbar (like Upwork/Slack) */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', paddingTop: '2px' }}>
                    <button
                      type="button"
                      className="icon-btn"
                      title="Bold (**text**)"
                      onClick={() => applyFormatting('**')}
                      style={{ width: '28px', height: '28px', fontSize: '12px', fontWeight: 800, padding: 0 }}
                    >
                      B
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      title="Italic (*text*)"
                      onClick={() => applyFormatting('*')}
                      style={{ width: '28px', height: '28px', fontSize: '12px', fontStyle: 'italic', fontWeight: 700, padding: 0 }}
                    >
                      I
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      title="Strikethrough (~~text~~)"
                      onClick={() => applyFormatting('~~')}
                      style={{ width: '28px', height: '28px', fontSize: '12px', textDecoration: 'line-through', padding: 0 }}
                    >
                      S
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      title="Code Snippet"
                      onClick={() => setSnippetModalOpen(true)}
                      style={{ width: '28px', height: '28px', padding: 0 }}
                    >
                      <CodeIcon size={14} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      title={uploadingFile ? 'Uploading file...' : 'Attach File'}
                      onClick={() => !uploadingFile && fileInputRef.current?.click()}
                      disabled={uploadingFile}
                      style={{ width: '28px', height: '28px', padding: 0, opacity: uploadingFile ? 0.5 : 1 }}
                    >
                      <PaperclipIcon size={14} />
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      title="Insert Emoji"
                      onClick={() => setEmojiPickerOpen((prev) => !prev)}
                      style={{ width: '28px', height: '28px', padding: 0 }}
                    >
                      <SmileIcon size={14} />
                    </button>
                  </div>
                </div>
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
      <BookSessionModal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        mentor={{
          id: Number(otherId),
          user_id: Number(otherId),
          name: otherName || 'Mentor',
          hourly_rate: 50,
        }}
        initialTopic={scheduleTopic}
      />

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

      {/* Attachment Preview Modal */}
      <Modal
        isOpen={!!previewAttachment}
        onClose={() => setPreviewAttachment(null)}
        title={previewAttachment?.name ? `Attachment: ${previewAttachment.name}` : 'Attachment Preview'}
      >
        {previewAttachment && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {previewAttachment.isImage ? (
              <div
                style={{
                  width: '100%',
                  maxHeight: '62vh',
                  overflow: 'auto',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  background: 'rgba(0, 0, 0, 0.4)',
                  borderRadius: '8px',
                  padding: '12px',
                }}
              >
                <img
                  src={previewAttachment.url}
                  alt={previewAttachment.name}
                  style={{
                    maxWidth: '100%',
                    maxHeight: '58vh',
                    objectFit: 'contain',
                    borderRadius: '6px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                  }}
                  onError={(e) => {
                    if (!e.target.src.includes('/api/messages/attachment/view')) {
                      e.target.src = `/api/messages/attachment/view?name=${encodeURIComponent(previewAttachment.name)}`;
                    }
                  }}
                />
              </div>
            ) : (
              <div
                style={{
                  width: '100%',
                  padding: '30px 20px',
                  textAlign: 'center',
                  background: 'var(--bg)',
                  borderRadius: '8px',
                  border: '1px solid var(--grid-strong)',
                }}
              >
                <PaperclipIcon size={44} style={{ color: 'var(--accent)', marginBottom: '10px' }} />
                <div style={{ fontWeight: 700, fontSize: '15px', color: 'var(--ink)', marginBottom: '6px' }}>
                  {previewAttachment.name}
                </div>
                <p className="sub" style={{ fontSize: '13px', margin: 0 }}>
                  Preview is available in a new tab or you can download the file directly to your device.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px', flexWrap: 'wrap' }}>
              <a
                href={previewAttachment.url}
                target="_blank"
                rel="noreferrer"
                className="btn btn-ghost"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
              >
                <EyeIcon size={14} /> Open in New Tab ↗
              </a>
              <button
                type="button"
                onClick={() => handleDownloadAttachment(previewAttachment.name, previewAttachment.url)}
                className="btn btn-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <DownloadIcon size={14} /> Download File
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Conversation Confirmation Modal */}
      <Modal
        isOpen={!!chatToDelete}
        onClose={() => !deletingChat && setChatToDelete(null)}
        title="Delete Conversation"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              padding: '12px',
              borderRadius: '8px',
              background: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
            }}
          >
            <AlertTriangleIcon size={22} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--ink)' }}>
              Are you sure you want to delete the conversation with <strong>{chatToDelete?.name || 'this user'}</strong>?
              <div style={{ marginTop: '5px', color: 'var(--ink-muted)', fontSize: '12px' }}>
                This chat will be removed <strong>only from your side</strong>. The other participant will still keep their full message history.
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '6px' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setChatToDelete(null)}
              disabled={deletingChat}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleConfirmDeleteChat}
              disabled={deletingChat}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <TrashIcon size={14} />
              {deletingChat ? 'Deleting...' : 'Delete for Me'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Single Message Confirmation Modal */}
      <Modal
        isOpen={!!messageToDelete}
        onClose={() => setMessageToDelete(null)}
        title="Delete Message"
      >
        {messageToDelete && (() => {
          const isMyMsg = messageToDelete.sender_id === user?.id;
          const createdAtMs = messageToDelete.created_at ? new Date(messageToDelete.created_at).getTime() : 0;
          const ageSeconds = createdAtMs ? Math.max(0, Math.floor((Date.now() - createdAtMs) / 1000)) : Infinity;
          const canDeleteForEveryone = isMyMsg && ageSeconds <= 60;
          const remainingSeconds = Math.max(0, 60 - ageSeconds);

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '13.5px', color: 'var(--ink)', lineHeight: '1.5' }}>
                {canDeleteForEveryone ? (
                  <div>
                    This message was sent <strong>{ageSeconds}s ago</strong> (within 1 minute).
                    <div style={{ marginTop: '6px', color: 'var(--ink-muted)', fontSize: '12.5px' }}>
                      You can delete this message for both participants (<strong>Delete for Everyone</strong>) or only remove it from your side (<strong>Delete for Me</strong>).
                    </div>
                  </div>
                ) : isMyMsg ? (
                  <div>
                    This message was sent more than 1 minute ago.
                    <div style={{ marginTop: '6px', color: 'var(--ink-muted)', fontSize: '12.5px' }}>
                      It can only be removed from your side. The other participant will still see it.
                    </div>
                  </div>
                ) : (
                  <div>
                    Are you sure you want to delete this message?
                    <div style={{ marginTop: '6px', color: 'var(--ink-muted)', fontSize: '12.5px' }}>
                      It will only be removed from your side. The other participant will still see it.
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => setMessageToDelete(null)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => handleConfirmDeleteMessage('me')}
                  style={{
                    border: '1px solid var(--grid-strong)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <TrashIcon size={13} />
                  Delete for Me
                </button>
                {canDeleteForEveryone && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => handleConfirmDeleteMessage('everyone')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                    title="Delete message for both participants"
                  >
                    <TrashIcon size={14} />
                    Delete for Everyone ({remainingSeconds}s)
                  </button>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>
    </PortalLayout>
  );
}
