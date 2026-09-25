import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useParams, useNavigate, Link } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import { bookingApi, initials, formatCurrency } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import {
  MicIcon,
  MicOffIcon,
  CameraIcon,
  CameraOffIcon,
  ScreenShareIcon,
  MessageIcon,
  PaperclipIcon,
  PhoneOffIcon,
  ClockIcon,
  CheckCircleIcon,
  DocumentIcon,
  ArrowLeftIcon,
} from '../../components/Icons';
import { useToast } from '../../context';

// Public free Google STUN servers for WebRTC P2P NAT traversal
const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

export default function SessionRoomPage() {
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const params = useParams();
  const bookingId = searchParams.get('booking_id') || params.id || params.booking_id;
  const { user } = useAuth();
  const navigate = useNavigate();

  // Session & Auth state
  const [sessionData, setSessionData] = useState(null);
  const [tooEarlyInfo, setTooEarlyInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Media states
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [mediaPermissionDenied, setMediaPermissionDenied] = useState(false);

  // WebRTC Live Video Connection states
  const [connectionStatus, setConnectionStatus] = useState('initializing'); // 'initializing' | 'waiting' | 'connecting' | 'connected'
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [isRemoteCamOff, setIsRemoteCamOff] = useState(false);
  const [isRemoteMuted, setIsRemoteMuted] = useState(false);
  const [isRemoteScreenSharing, setIsRemoteScreenSharing] = useState(false);
  const [testLoopbackActive, setTestLoopbackActive] = useState(false);

  // Active sidebar tab: 'notes' | 'chat' | 'files'
  const [activeTab, setActiveTab] = useState('notes');

  // Notes state
  const [notes, setNotes] = useState('');
  const [notesStatus, setNotesStatus] = useState('Private to you — auto-saves as you type');
  const saveNotesTimerRef = useRef(null);

  // Timer state
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // In-Call Chat state
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');

  // File Sharing state
  const [files, setFiles] = useState([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef(null);

  // Session Completion Modal
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [summaryText, setSummaryText] = useState('');
  const [actionItems, setActionItems] = useState('');
  const [completing, setCompleting] = useState(false);

  // Video & Stream DOM Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const chatBottomRef = useRef(null);

  // WebRTC Core Refs
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const lastSignalIdRef = useRef(0);
  const signalingIntervalRef = useRef(null);
  const isInitiatorRef = useRef(false);

  // 1. Initialize session metadata
  useEffect(() => {
    if (!bookingId) {
      setError('No session specified.');
      setLoading(false);
      return;
    }

    async function initSession() {
      try {
        const [tokenRes, notesRes, filesRes, summaryRes] = await Promise.all([
          bookingApi.getLiveKitToken(bookingId),
          bookingApi.getNotes(bookingId).catch(() => ({ notes: '' })),
          bookingApi.getSessionFiles(bookingId).catch(() => []),
          bookingApi.getSessionSummary(bookingId).catch(() => ({ summary_text: '', action_items: '' })),
        ]);

        const rawScheduled = tokenRes.scheduled_at || tokenRes.scheduled_time;
        if (rawScheduled && tokenRes.status === 'paid') {
          const schedDate = new Date(rawScheduled);
          if (!isNaN(schedDate.getTime())) {
            const startMs = schedDate.getTime();
            const openMs = startMs - 15 * 60 * 1000;
            const now = Date.now();
            if (now < openMs) {
              setSessionData(tokenRes);
              setTooEarlyInfo({
                scheduledAt: schedDate,
                opensAt: new Date(openMs),
              });
              setLoading(false);
              return;
            }
          }
        }

        setSessionData(tokenRes);
        setNotes(notesRes.notes || '');
        setFiles(Array.isArray(filesRes) ? filesRes : []);
        setSummaryText(summaryRes.summary_text || '');
        setActionItems(summaryRes.action_items || '');

        // Learners initiate WebRTC handshake by default
        isInitiatorRef.current = !tokenRes.is_mentor;

        setChatMessages([
          {
            id: 1,
            sender: 'PairUp System',
            isSystem: true,
            text: `WebRTC Live Room "${tokenRes.room_name}" established. Real-time P2P video, audio, screen share, and data channel ready.`,
            time: 'Just now',
          },
        ]);
      } catch (err) {
        setError(err.message || 'Could not connect to session room.');
      } finally {
        setLoading(false);
      }
    }

    initSession();
  }, [bookingId]);

  // 2. Initialize Local Camera & Microphone Stream
  useEffect(() => {
    let active = true;

    async function setupLocalMedia() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('getUserMedia not supported in this browser.');
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280, max: 1920 },
            height: { ideal: 720, max: 1080 },
            frameRate: { ideal: 30 },
          },
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });

        if (!active) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        localStreamRef.current = stream;
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        setConnectionStatus('waiting');

        // Once local media is ready, connect WebRTC
        startWebRTCSignaling();
      } catch (err) {
        console.warn('Camera/Microphone access denied or unavailable:', err);
        setMediaPermissionDenied(true);
        setConnectionStatus('waiting');
        startWebRTCSignaling();
      }
    }

    if (sessionData && !tooEarlyInfo) {
      setupLocalMedia();
    }

    return () => {
      active = false;
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (signalingIntervalRef.current) {
        clearInterval(signalingIntervalRef.current);
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
      }
    };
  }, [sessionData, tooEarlyInfo]);

  // 3. WebRTC PeerConnection and Signaling Engine
  const createPeerConnection = () => {
    if (peerConnectionRef.current) {
      return peerConnectionRef.current;
    }

    const pc = new RTCPeerConnection(RTC_CONFIG);
    peerConnectionRef.current = pc;

    // Attach local audio & video tracks to PeerConnection
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // ICE Candidate Generation: send to signaling endpoint
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        bookingApi
          .sendSessionSignal(bookingId, 'candidate', event.candidate.toJSON())
          .catch((e) => console.warn('Signal send candidate failed:', e));
      }
    };

    // Remote Track Received: Attach to Remote Video Element
    pc.ontrack = (event) => {
      console.log('>>> WebRTC ontrack received:', event.track.kind, event.streams);
      const [stream] = event.streams;
      if (stream) {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = stream;
        }
        setHasRemoteVideo(true);
        setConnectionStatus('connected');
      }
    };

    // Connection State Change
    pc.onconnectionstatechange = () => {
      console.log('>>> WebRTC Connection State:', pc.connectionState);
      if (pc.connectionState === 'connected') {
        setConnectionStatus('connected');
      } else if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        setConnectionStatus('waiting');
        setHasRemoteVideo(false);
      }
    };

    return pc;
  };

  // Start polling signals from the backend signaling endpoint
  const startWebRTCSignaling = async () => {
    // Send initial join announce
    try {
      await bookingApi.sendSessionSignal(bookingId, 'join', {
        user_name: user?.name || 'Participant',
        is_mentor: sessionData?.is_mentor,
      });
    } catch (_) {}

    // Clear any previous interval
    if (signalingIntervalRef.current) clearInterval(signalingIntervalRef.current);

    // Poll every 1000ms for incoming signals from counterparty
    signalingIntervalRef.current = setInterval(async () => {
      try {
        const res = await bookingApi.getSessionSignals(bookingId, lastSignalIdRef.current);
        const incoming = res.signals || [];
        for (const sig of incoming) {
          lastSignalIdRef.current = Math.max(lastSignalIdRef.current, sig.id);
          await handleIncomingSignal(sig);
        }
      } catch (err) {
        // Silent poll error
      }
    }, 1000);
  };

  // Process incoming WebRTC signal
  const handleIncomingSignal = async (sig) => {
    const { signal_type, data } = sig;
    console.log('>>> WebRTC Signal received:', signal_type);

    if (signal_type === 'join') {
      // Counterparty joined!
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: 'PairUp System',
          isSystem: true,
          text: `👋 ${data?.user_name || 'Participant'} joined the video room. Establishing direct WebRTC connection...`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);

      // If we are the designated caller / initiator, create and dispatch the offer
      if (isInitiatorRef.current) {
        const pc = createPeerConnection();
        setConnectionStatus('connecting');
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        });
        await pc.setLocalDescription(offer);
        await bookingApi.sendSessionSignal(bookingId, 'offer', offer);
      }
    } else if (signal_type === 'offer') {
      // Counterparty sent an offer: set remote description, create and dispatch answer
      const pc = createPeerConnection();
      setConnectionStatus('connecting');
      await pc.setRemoteDescription(new RTCSessionDescription(data));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await bookingApi.sendSessionSignal(bookingId, 'answer', answer);
    } else if (signal_type === 'answer') {
      // Counterparty answered our offer
      const pc = peerConnectionRef.current;
      if (pc && pc.signalingState !== 'stable') {
        await pc.setRemoteDescription(new RTCSessionDescription(data));
      }
    } else if (signal_type === 'candidate') {
      // Counterparty ICE Candidate
      const pc = peerConnectionRef.current;
      if (pc && data) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data));
        } catch (err) {
          console.warn('Could not add ICE candidate:', err);
        }
      }
    } else if (signal_type === 'state') {
      // Media state sync
      if (data.isCamOff !== undefined) setIsRemoteCamOff(data.isCamOff);
      if (data.isMuted !== undefined) setIsRemoteMuted(data.isMuted);
      if (data.isScreenSharing !== undefined) setIsRemoteScreenSharing(data.isScreenSharing);
    } else if (signal_type === 'leave') {
      setHasRemoteVideo(false);
      setConnectionStatus('waiting');
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: 'PairUp System',
          isSystem: true,
          text: `ℹ️ Participant left the call.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }
  };

  // 4. Mic & Camera Toggles
  const handleToggleMic = () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);

    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = !newMuted;
      });
    }

    // Broadcast state to remote peer
    bookingApi
      .sendSessionSignal(bookingId, 'state', {
        isMuted: newMuted,
        isCamOff,
        isScreenSharing,
      })
      .catch(() => {});
  };

  const handleToggleCamera = () => {
    const newCamOff = !isCamOff;
    setIsCamOff(newCamOff);

    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach((t) => {
        t.enabled = !newCamOff;
      });
    }

    // Broadcast state to remote peer
    bookingApi
      .sendSessionSignal(bookingId, 'state', {
        isMuted,
        isCamOff: newCamOff,
        isScreenSharing,
      })
      .catch(() => {});
  };

  // 5. Screen Share Track Handling
  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      handleStopScreenShare();
      return;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
        toast.warning('Screen sharing is not supported on this device/browser.');
        return;
      }

      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always' },
        audio: false,
      });

      screenStreamRef.current = stream;
      setIsScreenSharing(true);

      if (screenVideoRef.current) {
        screenVideoRef.current.srcObject = stream;
      }

      // Replace WebRTC video track with screen track
      const screenTrack = stream.getVideoTracks()[0];
      const pc = peerConnectionRef.current;
      if (pc) {
        const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack);
        }
      }

      // Broadcast screen share state
      bookingApi.sendSessionSignal(bookingId, 'state', {
        isScreenSharing: true,
        isCamOff,
        isMuted,
      });

      screenTrack.onended = () => {
        handleStopScreenShare();
      };
    } catch (err) {
      console.warn('Screen sharing cancelled or error:', err);
      setIsScreenSharing(false);
    }
  };

  const handleStopScreenShare = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    setIsScreenSharing(false);

    // Restore camera track to WebRTC sender
    const pc = peerConnectionRef.current;
    if (pc && localStreamRef.current) {
      const camTrack = localStreamRef.current.getVideoTracks()[0];
      const sender = pc.getSenders().find((s) => s.track && s.track.kind === 'video');
      if (sender && camTrack) {
        sender.replaceTrack(camTrack);
      }
    }

    // Broadcast state
    bookingApi.sendSessionSignal(bookingId, 'state', {
      isScreenSharing: false,
      isCamOff,
      isMuted,
    });
  };

  // 6. Test Loopback Mode (for single user testing in one window)
  const handleToggleLoopback = () => {
    if (testLoopbackActive) {
      setTestLoopbackActive(false);
      setHasRemoteVideo(false);
      if (remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = null;
      }
    } else {
      if (localStreamRef.current && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = localStreamRef.current;
        setHasRemoteVideo(true);
        setTestLoopbackActive(true);
        setConnectionStatus('connected');
      } else {
        toast.info('Please allow camera access first to test loopback.');
      }
    }
  };

  // 7. Session Elapsed Timer (counts active call time only while connected or testing dual video)
  useEffect(() => {
    if (!sessionData || (connectionStatus !== 'connected' && !testLoopbackActive)) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionData, connectionStatus, testLoopbackActive]);

  // 8. Notes auto-save
  const handleNotesChange = (e) => {
    const val = e.target.value;
    setNotes(val);
    setNotesStatus('Saving…');

    if (saveNotesTimerRef.current) clearTimeout(saveNotesTimerRef.current);
    saveNotesTimerRef.current = setTimeout(async () => {
      try {
        await bookingApi.saveNotes(bookingId, val);
        setNotesStatus('Saved · private to you');
      } catch (err) {
        setNotesStatus('Error saving: ' + err.message);
      }
    }, 800);
  };

  // 9. In-Call Chat Send
  const handleSendMessage = (e) => {
    e.preventDefault();
    const text = chatInput.trim();
    if (!text) return;

    const newMsg = {
      id: Date.now(),
      sender: user?.name || 'Me',
      isMe: true,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput('');
    setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  // 10. File Sharing Upload
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 25 * 1024 * 1024) {
      toast.error('File size exceeds 25MB limit.');
      return;
    }

    setUploadingFile(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('filename', file.name);

    try {
      const uploaded = await bookingApi.uploadSessionFile(bookingId, formData);
      setFiles((prev) => [uploaded, ...prev]);

      // Announce file upload in chat
      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: 'PairUp System',
          isSystem: true,
          text: `📎 ${user?.name || 'A user'} shared a file: "${file.name}" (${(file.size / 1024).toFixed(1)} KB)`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (err) {
      toast.error('Failed to upload file: ' + err.message);
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 11. Session Completion Handler
  const handleCompleteSession = async () => {
    setCompleting(true);
    try {
      await bookingApi.saveSessionSummary(bookingId, {
        summary_text: summaryText,
        action_items: actionItems,
        duration_seconds: elapsedSeconds,
        complete_session: true,
      });

      // Broadcast leave signal
      bookingApi.sendSessionSignal(bookingId, 'leave', {}).catch(() => {});

      toast.success('Session marked complete! Escrow funds released to mentor balance.');
      if (user?.role === 'mentor') {
        navigate('/mentor/sessions');
      } else {
        navigate('/learner/sessions');
      }
    } catch (err) {
      toast.error('Error completing session: ' + err.message);
      setCompleting(false);
    }
  };

  // Timer formatting
  const totalMinutes = sessionData?.duration_minutes || 60;
  const totalSeconds = totalMinutes * 60;
  const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
  const elapsedMinStr = String(Math.floor(elapsedSeconds / 60)).padStart(2, '0');
  const elapsedSecStr = String(elapsedSeconds % 60).padStart(2, '0');
  const isEndingSoon = remainingSeconds <= 300 && remainingSeconds > 0;
  const isTimeOver = elapsedSeconds > totalSeconds;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0F172A', color: '#F8FAFC', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #334155', borderTopColor: '#0EA5E9', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ color: '#94A3B8' }}>Connecting to Live WebRTC Session Room...</p>
        </div>
        <Footer />
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (tooEarlyInfo && sessionData) {
    const isMentor = sessionData.is_mentor;
    return (
      <div style={{ minHeight: '100vh', background: '#0F172A', color: '#F8FAFC', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', padding: '20px' }}>
          <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '16px', padding: '36px 32px', maxWidth: '520px', textAlign: 'center', boxShadow: '0 8px 30px rgba(0,0,0,0.3)' }}>
            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(56, 189, 248, 0.12)', border: '1px solid #38BDF8', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', color: '#38BDF8' }}>
              <ClockIcon size={28} />
            </div>
            <h3 style={{ color: '#F8FAFC', marginBottom: '8px', fontSize: '18px', fontWeight: 700 }}>Live Room Not Open Yet</h3>
            <p style={{ color: '#94A3B8', fontSize: '13.5px', lineHeight: 1.5, marginBottom: '20px' }}>
              This session ({sessionData.topic || 'Pair Programming'}) is scheduled for{' '}
              <strong style={{ color: '#F8FAFC' }}>{tooEarlyInfo.scheduledAt.toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</strong>.
              <br />
              The live video call room activates <strong style={{ color: '#38BDF8' }}>15 minutes</strong> before start time ({tooEarlyInfo.opensAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}).
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => navigate(isMentor ? '/mentor/sessions' : '/learner/sessions')}
                style={{ background: '#0284C7', color: '#fff', border: 'none', padding: '10px 22px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
              >
                Back to My Sessions
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{ background: 'transparent', color: '#94A3B8', border: '1px solid #475569', padding: '10px 18px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
              >
                Refresh Room
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error || !sessionData) {
    return (
      <div style={{ minHeight: '100vh', background: '#0F172A', color: '#F8FAFC', display: 'flex', flexDirection: 'column' }}>
        <Navbar />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '16px', padding: '20px' }}>
          <div style={{ background: '#1E293B', border: '1px solid #334155', borderRadius: '16px', padding: '32px', maxWidth: '480px', textAlign: 'center' }}>
            <h3 style={{ color: '#EF4444', marginBottom: '8px' }}>Session Error</h3>
            <p style={{ color: '#94A3B8', marginBottom: '24px' }}>{error}</p>
            <button
              onClick={() => navigate(-1)}
              style={{ background: '#0284C7', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 600 }}
            >
              Go Back
            </button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const otherName = sessionData.other_name || 'Participant';
  const isMentor = sessionData.is_mentor;

  return (
    <div style={{ minHeight: '100vh', background: '#0B1120', color: '#F8FAFC', display: 'flex', flexDirection: 'column' }}>
      <Navbar />

      <main style={{ flex: 1, padding: '16px 24px 32px' }}>
        <div style={{ maxWidth: '1440px', margin: '0 auto' }}>
          {/* Top Bar: Session Info, Connection Status, Timer, Actions */}
          <div style={{ background: '#1E293B', borderRadius: '16px', padding: '14px 20px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid #334155', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Leave this live session room and go back?')) {
                    if (window.history.state && window.history.state.idx > 0) {
                      navigate(-1);
                    } else {
                      navigate(isMentor ? '/mentor/sessions' : '/learner/sessions');
                    }
                  }
                }}
                className="portal-back-btn"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  borderColor: '#475569',
                  color: '#F8FAFC',
                }}
                title="Leave room and return"
              >
                <ArrowLeftIcon size={15} />
                <span>Back</span>
              </button>
              <div
                style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  background: connectionStatus === 'connected' ? '#22C55E' : '#F59E0B',
                  boxShadow: `0 0 10px ${connectionStatus === 'connected' ? '#22C55E' : '#F59E0B'}`,
                  animation: connectionStatus !== 'connected' ? 'pulse 1.5s infinite' : 'none',
                }}
              />
              <div>
                <div style={{ color: '#F8FAFC', fontWeight: 800, fontSize: '15px' }}>
                  Live Session: {sessionData.topic}
                </div>
                <div style={{ color: '#94A3B8', fontSize: '12px', marginTop: '2px' }}>
                  Pairing with <strong style={{ color: '#38BDF8' }}>{otherName}</strong> · Room:{' '}
                  <span style={{ fontFamily: 'monospace', color: '#CBD5E1' }}>{sessionData.room_name}</span> · ₹{sessionData.price}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {/* Connection Status Badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: connectionStatus === 'connected' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  border: `1px solid ${connectionStatus === 'connected' ? '#22C55E' : '#F59E0B'}`,
                  borderRadius: '10px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: connectionStatus === 'connected' ? '#4ADE80' : '#FBBF24',
                }}
              >
                <span>
                  {connectionStatus === 'connected'
                    ? '● WebRTC Connected'
                    : connectionStatus === 'connecting'
                    ? 'Connecting Peer…'
                    : 'Waiting for Peer…'}
                </span>
              </div>

              {/* Loopback Test Button */}
              <button
                type="button"
                onClick={handleToggleLoopback}
                title="Simulate remote participant video using your own camera to test two-way view"
                style={{
                  background: testLoopbackActive ? '#0284C7' : '#334155',
                  color: '#fff',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {testLoopbackActive ? '✓ Loopback Active' : '🧪 Test Dual Video'}
              </button>

              {/* Timer Badge */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: isTimeOver ? '#450A0A' : isEndingSoon ? '#422006' : '#0F172A',
                  padding: '6px 14px',
                  borderRadius: '10px',
                  border: `1px solid ${isTimeOver ? '#EF4444' : isEndingSoon ? '#F59E0B' : '#334155'}`,
                }}
              >
                <ClockIcon size={16} className={isTimeOver ? 'text-red-400' : isEndingSoon ? 'text-amber-400' : 'text-slate-400'} />
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: isTimeOver ? '#F87171' : isEndingSoon ? '#FBBF24' : '#F8FAFC',
                  }}
                >
                  {connectionStatus === 'connected' || testLoopbackActive
                    ? `${elapsedMinStr}:${elapsedSecStr} / ${totalMinutes}:00`
                    : `00:00 / ${totalMinutes}:00`}
                </span>
                {(connectionStatus === 'connected' || testLoopbackActive) && isEndingSoon && !isTimeOver && (
                  <span style={{ fontSize: '11px', color: '#FBBF24', fontWeight: 700, marginLeft: '4px' }}>5m left</span>
                )}
                {(connectionStatus === 'connected' || testLoopbackActive) && isTimeOver && (
                  <span style={{ fontSize: '11px', color: '#F87171', fontWeight: 700, marginLeft: '4px' }}>Overtime</span>
                )}
                {connectionStatus !== 'connected' && !testLoopbackActive && (
                  <span style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 500, marginLeft: '4px' }}>Ready · Timer Paused</span>
                )}
              </div>

              {/* Complete Session Button */}
              <button
                type="button"
                onClick={() => setShowCompleteModal(true)}
                style={{
                  background: '#0D9488',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <CheckCircleIcon size={16} />
                End & Complete
              </button>
            </div>
          </div>

          {/* Main Layout: Video Stage (Left) & Collaboration Sidebar (Right) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 380px', gap: '16px', minHeight: '620px' }}>
            {/* Left Column: Video Stage & Controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{
                  flex: 1,
                  background: '#060A12',
                  borderRadius: '16px',
                  position: 'relative',
                  overflow: 'hidden',
                  border: '1px solid #1E293B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: '480px',
                }}
              >
                {/* 1. Remote Screen Share Display (If remote user is sharing screen) */}
                {isRemoteScreenSharing ? (
                  <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000' }}>
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '16px',
                        left: '16px',
                        background: 'rgba(15, 23, 42, 0.85)',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        color: '#38BDF8',
                        fontSize: '12px',
                        fontWeight: 700,
                        border: '1px solid #38BDF8',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <ScreenShareIcon size={14} /> {otherName} is Sharing Screen
                    </div>
                  </div>
                ) : isScreenSharing ? (
                  /* 2. Local Screen Share Preview (If you are sharing screen) */
                  <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000' }}>
                    <video
                      ref={screenVideoRef}
                      autoPlay
                      playsInline
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        top: '16px',
                        left: '16px',
                        background: 'rgba(15, 23, 42, 0.85)',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        color: '#38BDF8',
                        fontSize: '12px',
                        fontWeight: 700,
                        border: '1px solid #38BDF8',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <ScreenShareIcon size={14} /> You are sharing your screen
                    </div>
                  </div>
                ) : hasRemoteVideo && !isRemoteCamOff ? (
                  /* 3. REAL REMOTE LIVE VIDEO STREAM */
                  <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000' }}>
                    <video
                      ref={remoteVideoRef}
                      autoPlay
                      playsInline
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div
                      style={{
                        position: 'absolute',
                        bottom: '16px',
                        left: '16px',
                        background: 'rgba(15, 23, 42, 0.85)',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        color: '#F8FAFC',
                        fontSize: '12px',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>{otherName}</span>
                      {isRemoteMuted && <span style={{ color: '#EF4444' }}>(Muted)</span>}
                    </div>
                  </div>
                ) : (
                  /* 4. Remote Participant Waiting or Camera Off State */
                  <div style={{ textAlign: 'center', padding: '40px', maxWidth: '420px' }}>
                    <div
                      style={{
                        width: '104px',
                        height: '104px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #0284C7, #0369A1)',
                        margin: '0 auto 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '34px',
                        fontWeight: 800,
                        border: '3px solid #38BDF8',
                        boxShadow: '0 0 30px rgba(56, 189, 248, 0.3)',
                      }}
                    >
                      {initials(otherName)}
                    </div>
                    <h4 style={{ color: '#F8FAFC', margin: '0 0 6px', fontSize: '18px', fontWeight: 700 }}>
                      {otherName} ({isMentor ? 'Learner' : 'Mentor'})
                    </h4>
                    {hasRemoteVideo && isRemoteCamOff ? (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#1E293B',
                          padding: '6px 14px',
                          borderRadius: '20px',
                          fontSize: '12px',
                          color: '#94A3B8',
                        }}
                      >
                        <CameraOffIcon size={14} className="text-amber-400" />
                        Camera paused · Audio active
                      </div>
                    ) : (
                      <div>
                        <p style={{ color: '#94A3B8', fontSize: '13px', margin: '8px 0 14px', lineHeight: 1.6 }}>
                          Waiting for <strong>{otherName}</strong> ({isMentor ? 'Learner' : 'Mentor'}) to enter the session room.
                          <br />
                          {sessionData?.scheduled_at && (
                            <span style={{ color: '#38BDF8', display: 'inline-block', marginTop: '4px' }}>
                              📅 Scheduled Time: {new Date(sessionData.scheduled_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            </span>
                          )}
                          <br />
                          <span style={{ fontSize: '11.5px', color: '#64748B', display: 'inline-block', marginTop: '4px' }}>
                            Video, audio, and session timer will start automatically when both of you are connected.
                          </span>
                        </p>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            background: '#1E293B',
                            border: '1px solid #334155',
                            padding: '6px 14px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            color: '#38BDF8',
                            marginBottom: '16px',
                          }}
                        >
                          <div
                            style={{
                              width: '8px',
                              height: '8px',
                              borderRadius: '50%',
                              background: '#38BDF8',
                              animation: 'pulse 1.5s infinite',
                            }}
                          />
                          Room Ready · Waiting for {otherName}…
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() => navigate(isMentor ? '/mentor/sessions' : '/learner/sessions')}
                            style={{
                              background: 'transparent',
                              border: '1px solid #475569',
                              color: '#CBD5E1',
                              padding: '6px 16px',
                              borderRadius: '8px',
                              fontSize: '12px',
                              cursor: 'pointer',
                            }}
                          >
                            ← Return to Sessions (Join Later)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Local Camera PIP (Picture-In-Picture) */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '16px',
                    right: '16px',
                    width: '180px',
                    height: '120px',
                    borderRadius: '12px',
                    background: '#1E293B',
                    border: '2px solid #334155',
                    overflow: 'hidden',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
                    zIndex: 10,
                  }}
                >
                  {isCamOff || mediaPermissionDenied ? (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#94A3B8',
                        fontSize: '12px',
                        gap: '4px',
                      }}
                    >
                      <CameraOffIcon size={22} />
                      <span>{mediaPermissionDenied ? 'No Camera' : 'Camera Off'}</span>
                    </div>
                  ) : (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  )}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '6px',
                      left: '8px',
                      background: 'rgba(0,0,0,0.6)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      color: '#fff',
                      fontWeight: 700,
                    }}
                  >
                    You {isMuted && '(Muted)'}
                  </div>
                </div>
              </div>

              {/* Bottom Call Control Bar */}
              <div
                style={{
                  background: '#1E293B',
                  borderRadius: '14px',
                  padding: '12px 24px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '16px',
                  border: '1px solid #334155',
                }}
              >
                {/* Mic Toggle */}
                <button
                  type="button"
                  onClick={handleToggleMic}
                  title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    border: 'none',
                    background: isMuted ? '#EF4444' : '#334155',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {isMuted ? <MicOffIcon size={20} /> : <MicIcon size={20} />}
                </button>

                {/* Camera Toggle */}
                <button
                  type="button"
                  onClick={handleToggleCamera}
                  title={isCamOff ? 'Turn camera on' : 'Turn camera off'}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    border: 'none',
                    background: isCamOff ? '#EF4444' : '#334155',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {isCamOff ? <CameraOffIcon size={20} /> : <CameraIcon size={20} />}
                </button>

                {/* Screen Share Toggle */}
                <button
                  type="button"
                  onClick={handleToggleScreenShare}
                  title={isScreenSharing ? 'Stop screen sharing' : 'Share screen'}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    border: 'none',
                    background: isScreenSharing ? '#0284C7' : '#334155',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <ScreenShareIcon size={20} />
                </button>

                {/* Open Chat Tab button */}
                <button
                  type="button"
                  onClick={() => setActiveTab('chat')}
                  title="In-call chat"
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    border: 'none',
                    background: activeTab === 'chat' ? '#0284C7' : '#334155',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <MessageIcon size={20} />
                </button>

                {/* End Call Button */}
                <button
                  type="button"
                  onClick={() => setShowCompleteModal(true)}
                  title="End session"
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    border: 'none',
                    background: '#DC2626',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    marginLeft: '16px',
                  }}
                >
                  <PhoneOffIcon size={20} />
                </button>
              </div>
            </div>

            {/* Right Column: Collaboration Sidebar (Notes, In-Call Chat, Files) */}
            <div
              style={{
                background: '#1E293B',
                borderRadius: '16px',
                border: '1px solid #334155',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
              }}
            >
              {/* Sidebar Navigation Tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid #334155', background: '#0F172A' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('notes')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: 'none',
                    background: activeTab === 'notes' ? '#1E293B' : 'transparent',
                    color: activeTab === 'notes' ? '#38BDF8' : '#94A3B8',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    borderBottom: activeTab === 'notes' ? '2px solid #38BDF8' : 'none',
                  }}
                >
                  <DocumentIcon size={16} /> Notes
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('chat')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: 'none',
                    background: activeTab === 'chat' ? '#1E293B' : 'transparent',
                    color: activeTab === 'chat' ? '#38BDF8' : '#94A3B8',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    borderBottom: activeTab === 'chat' ? '2px solid #38BDF8' : 'none',
                  }}
                >
                  <MessageIcon size={16} /> Chat
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('files')}
                  style={{
                    flex: 1,
                    padding: '12px',
                    border: 'none',
                    background: activeTab === 'files' ? '#1E293B' : 'transparent',
                    color: activeTab === 'files' ? '#38BDF8' : '#94A3B8',
                    fontWeight: 700,
                    fontSize: '13px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    borderBottom: activeTab === 'files' ? '2px solid #38BDF8' : 'none',
                  }}
                >
                  <PaperclipIcon size={16} /> Files ({files.length})
                </button>
              </div>

              {/* Tab 1: Private Notes */}
              {activeTab === 'notes' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#94A3B8' }}>{notesStatus}</span>
                  </div>
                  <textarea
                    value={notes}
                    onChange={handleNotesChange}
                    placeholder="Take session notes, code snippets, debug commands, or solutions here..."
                    style={{
                      flex: 1,
                      width: '100%',
                      background: '#0F172A',
                      border: '1px solid #334155',
                      borderRadius: '10px',
                      padding: '12px',
                      color: '#F8FAFC',
                      fontSize: '13px',
                      lineHeight: '1.6',
                      resize: 'none',
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>
              )}

              {/* Tab 2: In-Call Real-Time Chat */}
              {activeTab === 'chat' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        style={{
                          alignSelf: msg.isSystem ? 'center' : msg.isMe ? 'flex-end' : 'flex-start',
                          maxWidth: msg.isSystem ? '100%' : '80%',
                        }}
                      >
                        {msg.isSystem ? (
                          <div
                            style={{
                              background: '#0F172A',
                              padding: '6px 12px',
                              borderRadius: '8px',
                              color: '#94A3B8',
                              fontSize: '11px',
                              textAlign: 'center',
                              border: '1px solid #334155',
                            }}
                          >
                            {msg.text}
                          </div>
                        ) : (
                          <div>
                            <div
                              style={{
                                fontSize: '11px',
                                color: '#94A3B8',
                                marginBottom: '2px',
                                textAlign: msg.isMe ? 'right' : 'left',
                              }}
                            >
                              {msg.sender} · {msg.time}
                            </div>
                            <div
                              style={{
                                background: msg.isMe ? '#0284C7' : '#334155',
                                color: '#fff',
                                padding: '8px 12px',
                                borderRadius: '12px',
                                fontSize: '13px',
                                lineHeight: '1.4',
                                wordBreak: 'break-word',
                              }}
                            >
                              {msg.text}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                    <div ref={chatBottomRef} />
                  </div>

                  <form
                    onSubmit={handleSendMessage}
                    style={{
                      padding: '12px',
                      borderTop: '1px solid #334155',
                      background: '#0F172A',
                      display: 'flex',
                      gap: '8px',
                    }}
                  >
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Send in-call message..."
                      style={{
                        flex: 1,
                        background: '#1E293B',
                        border: '1px solid #334155',
                        borderRadius: '8px',
                        padding: '8px 12px',
                        color: '#fff',
                        fontSize: '13px',
                        outline: 'none',
                      }}
                    />
                    <button
                      type="submit"
                      style={{
                        background: '#0284C7',
                        color: '#fff',
                        border: 'none',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        fontWeight: 700,
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      Send
                    </button>
                  </form>
                </div>
              )}

              {/* Tab 3: Session Shared Files */}
              {activeTab === 'files' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#F8FAFC' }}>Shared Attachments</span>
                    <label
                      style={{
                        background: uploadingFile ? '#334155' : '#0284C7',
                        color: '#fff',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: uploadingFile ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <PaperclipIcon size={14} />
                      {uploadingFile ? 'Uploading…' : 'Share File'}
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileUpload}
                        disabled={uploadingFile}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>

                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {files.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '40px 16px', color: '#94A3B8', fontSize: '13px' }}>
                        No files shared in this call yet.
                        <p style={{ fontSize: '11px', color: '#64748B', marginTop: '4px' }}>
                          Upload logs, architectural diagrams, or code samples (up to 25MB).
                        </p>
                      </div>
                    ) : (
                      files.map((file) => (
                        <div
                          key={file.id}
                          style={{
                            background: '#0F172A',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            padding: '10px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <div style={{ overflow: 'hidden', marginRight: '8px' }}>
                            <div
                              style={{
                                color: '#F8FAFC',
                                fontSize: '13px',
                                fontWeight: 600,
                                textOverflow: 'ellipsis',
                                overflow: 'hidden',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {file.filename}
                            </div>
                            <div style={{ color: '#94A3B8', fontSize: '11px', marginTop: '2px' }}>
                              {(file.file_size / 1024).toFixed(1)} KB · by {file.uploader_name}
                            </div>
                          </div>
                          {file.file_url ? (
                            <a
                              href={file.file_url}
                              target="_blank"
                              rel="noreferrer"
                              download
                              style={{
                                background: '#334155',
                                color: '#38BDF8',
                                textDecoration: 'none',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                              }}
                            >
                              Download
                            </a>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Complete Session Modal */}
      {showCompleteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#1E293B',
              border: '1px solid #334155',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '520px',
              width: '100%',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
          >
            <h3 style={{ color: '#F8FAFC', margin: '0 0 8px', fontSize: '18px', fontWeight: 800 }}>
              Complete Mentoring Session
            </h3>
            <p style={{ color: '#94A3B8', fontSize: '13px', margin: '0 0 20px', lineHeight: '1.5' }}>
              Wrapping up this session archives notes and action items, releases locked escrow funds (₹{sessionData.price}) to
              the mentor, and prompts for feedback.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#CBD5E1', marginBottom: '6px' }}>
                  Session Summary / Takeaways
                </label>
                <textarea
                  value={summaryText}
                  onChange={(e) => setSummaryText(e.target.value)}
                  placeholder="Outline key solutions provided, architecture changes made, or topics debugged..."
                  style={{
                    width: '100%',
                    height: '80px',
                    background: '#0F172A',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '10px',
                    color: '#fff',
                    fontSize: '13px',
                    resize: 'none',
                    outline: 'none',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#CBD5E1', marginBottom: '6px' }}>
                  Recommended Action Items / Next Steps
                </label>
                <textarea
                  value={actionItems}
                  onChange={(e) => setActionItems(e.target.value)}
                  placeholder="Next steps for learner (e.g. read docs on React memoization, apply migration)..."
                  style={{
                    width: '100%',
                    height: '60px',
                    background: '#0F172A',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '10px',
                    color: '#fff',
                    fontSize: '13px',
                    resize: 'none',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setShowCompleteModal(false)}
                disabled={completing}
                style={{
                  background: 'transparent',
                  border: '1px solid #475569',
                  color: '#94A3B8',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontWeight: 600,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompleteSession}
                disabled={completing}
                style={{
                  background: '#0D9488',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 20px',
                  borderRadius: '8px',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: completing ? 'not-allowed' : 'pointer',
                }}
              >
                {completing ? 'Completing Session…' : 'Save & Release Payout'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.15); }
        }
      `}</style>
    </div>
  );
}
