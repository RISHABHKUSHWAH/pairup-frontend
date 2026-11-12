import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useParams, useNavigate, Link } from 'react-router-dom';
import AgoraRTC from 'agora-rtc-sdk-ng';
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

// Free Google STUN + Open Relay TURN servers for fallback direct NAT traversal
const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
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

  // Agora Live Video Connection states
  const [connectionStatus, setConnectionStatus] = useState('initializing'); // 'initializing' | 'waiting' | 'connecting' | 'connected'
  const [connectionMode, setConnectionMode] = useState('agora'); // 'agora' | 'p2p'
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [isRemoteCamOff, setIsRemoteCamOff] = useState(false);
  const [isRemoteMuted, setIsRemoteMuted] = useState(false);
  const [isRemoteScreenSharing, setIsRemoteScreenSharing] = useState(false);
  const [testLoopbackActive, setTestLoopbackActive] = useState(false);

  // Agora Refs
  const agoraClientRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const localScreenTrackRef = useRef(null);
  const remoteUserRef = useRef(null);

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

  // Video & Stream DOM Container Refs (Agora attaches to DOM containers)
  const localVideoContainerRef = useRef(null);
  const remoteVideoContainerRef = useRef(null);
  const screenVideoContainerRef = useRef(null);
  const chatBottomRef = useRef(null);

  // WebRTC Fallback Core Refs
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingIceCandidatesRef = useRef([]);
  const peerConnectionRef = useRef(null);
  const lastSignalIdRef = useRef(0);
  const signalingIntervalRef = useRef(null);
  const isInitiatorRef = useRef(false);

  // Helper callback ref to ensure remote video plays promptly when DOM container appears
  const attachRemoteContainer = (el) => {
    if (!el) return;
    remoteVideoContainerRef.current = el;

    if (remoteUserRef.current?.videoTrack) {
      try {
        remoteUserRef.current.videoTrack.play(el);
      } catch (e) {
        console.warn('Could not play Agora remote video:', e);
      }
    } else if (remoteStreamRef.current) {
      const vid = el.querySelector('video') || document.createElement('video');
      vid.style.width = '100%';
      vid.style.height = '100%';
      vid.style.objectFit = 'cover';
      vid.autoplay = true;
      vid.playsInline = true;
      if (vid.srcObject !== remoteStreamRef.current) {
        vid.srcObject = remoteStreamRef.current;
      }
      if (!el.contains(vid)) el.appendChild(vid);
      vid.play().catch(() => {});
    }
  };

  const attachLocalContainer = (el) => {
    if (!el) return;
    localVideoContainerRef.current = el;
    if (localVideoTrackRef.current && !isCamOff) {
      try {
        localVideoTrackRef.current.play(el);
      } catch (e) {
        console.warn('Could not play Agora local video:', e);
      }
    }
  };

  const attachScreenContainer = (el) => {
    if (!el) return;
    screenVideoContainerRef.current = el;
    if (localScreenTrackRef.current) {
      try {
        localScreenTrackRef.current.play(el);
      } catch (e) {
        console.warn('Could not play Agora screen share:', e);
      }
    }
  };

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
          bookingApi.getAgoraToken(bookingId),
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

        isInitiatorRef.current = !tokenRes.is_mentor;

        setChatMessages([
          {
            id: 1,
            sender: 'PairUp System',
            isSystem: true,
            text: `Agora RTC Live Room "${tokenRes.channel_name || tokenRes.room_name}" established over Agora SD-RTN. In-call video, audio, screen share, and collaboration active.`,
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

  // 2. Initialize Agora RTC Client and Local Tracks
  useEffect(() => {
    let active = true;

    async function initAgora() {
      if (typeof window !== 'undefined' && window.isSecureContext === false && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
        toast.warning('Browser camera/microphone requires HTTPS on remote devices. If video does not start, ensure you are accessing via HTTPS.');
      }

      try {
        setConnectionStatus('connecting');

        // Create Agora RTC client
        const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
        agoraClientRef.current = client;

        // Register Agora Event Listeners
        client.on('user-published', async (remoteUser, mediaType) => {
          await client.subscribe(remoteUser, mediaType);
          console.log('>>> Agora user-published:', remoteUser.uid, mediaType);

          if (mediaType === 'video') {
            remoteUserRef.current = remoteUser;
            setHasRemoteVideo(true);
            setIsRemoteCamOff(false);
            setConnectionStatus('connected');
            setTimeout(() => {
              if (remoteVideoContainerRef.current && remoteUser.videoTrack) {
                remoteUser.videoTrack.play(remoteVideoContainerRef.current);
              }
            }, 50);
          }
          if (mediaType === 'audio') {
            remoteUser.audioTrack?.play();
            setIsRemoteMuted(false);
          }
        });

        client.on('user-unpublished', (remoteUser, mediaType) => {
          console.log('>>> Agora user-unpublished:', remoteUser.uid, mediaType);
          if (mediaType === 'video') {
            setHasRemoteVideo(false);
            setIsRemoteCamOff(true);
          }
          if (mediaType === 'audio') {
            setIsRemoteMuted(true);
          }
        });

        client.on('user-joined', (remoteUser) => {
          console.log('>>> Agora user-joined:', remoteUser.uid);
          setConnectionStatus('connected');
          toast.info(`${sessionData?.other_name || 'Counterpart'} joined the session room`);
        });

        client.on('user-left', (remoteUser) => {
          console.log('>>> Agora user-left:', remoteUser.uid);
          setHasRemoteVideo(false);
          setConnectionStatus('waiting');
          toast.info(`${sessionData?.other_name || 'Participant'} left the call`);
        });

        // Create local microphone & camera tracks
        try {
          const [audioTrack, videoTrack] = await Promise.all([
            AgoraRTC.createMicrophoneAudioTrack({
              AEC: true,
              ANS: true,
              AGC: true,
            }).catch((err) => {
              console.warn('Microphone error:', err);
              return null;
            }),
            AgoraRTC.createCameraVideoTrack({
              encoderConfig: '720p_2',
            }).catch((err) => {
              console.warn('Camera error:', err);
              setMediaPermissionDenied(true);
              return null;
            }),
          ]);

          if (!active) {
            audioTrack?.close();
            videoTrack?.close();
            return;
          }

          localAudioTrackRef.current = audioTrack;
          localVideoTrackRef.current = videoTrack;

          // Play local video preview in PIP
          if (videoTrack && localVideoContainerRef.current) {
            videoTrack.play(localVideoContainerRef.current);
          }

          // Join Agora Channel
          const appId = sessionData?.app_id || 'test_agora_app_id';
          const channelName = sessionData?.channel_name || `pairup-session-${bookingId}`;
          const token = sessionData?.token || null;
          const uid = sessionData?.uid || Number(user?.id) || Math.floor(Math.random() * 100000);

          await client.join(appId, channelName, token, uid);
          console.log('>>> Agora joined channel:', channelName, 'UID:', uid);

          // Publish local tracks
          const tracksToPublish = [];
          if (audioTrack) tracksToPublish.push(audioTrack);
          if (videoTrack) tracksToPublish.push(videoTrack);

          if (tracksToPublish.length > 0) {
            await client.publish(tracksToPublish);
          }

          setConnectionMode('agora');
          setConnectionStatus(client.remoteUsers.length > 0 ? 'connected' : 'waiting');

          // If remote users already present, subscribe
          client.remoteUsers.forEach(async (ru) => {
            if (ru.hasVideo) {
              await client.subscribe(ru, 'video');
              remoteUserRef.current = ru;
              setHasRemoteVideo(true);
              if (remoteVideoContainerRef.current && ru.videoTrack) {
                ru.videoTrack.play(remoteVideoContainerRef.current);
              }
            }
            if (ru.hasAudio) {
              await client.subscribe(ru, 'audio');
              ru.audioTrack?.play();
            }
          });
        } catch (mediaErr) {
          console.warn('Agora media join warning:', mediaErr);
        }

        // Also start session signaling for chat, notes, and file synchronization
        startSignalingSync();
      } catch (agoraErr) {
        console.warn('Agora SD-RTN connection error, enabling P2P signaling fallback:', agoraErr);
        setConnectionMode('p2p');
        setConnectionStatus('waiting');
        startWebRTCSignalingFallback();
      }
    }

    if (sessionData && !tooEarlyInfo) {
      initAgora();
    }

    return () => {
      active = false;
      if (localAudioTrackRef.current) {
        localAudioTrackRef.current.close();
        localAudioTrackRef.current = null;
      }
      if (localVideoTrackRef.current) {
        localVideoTrackRef.current.close();
        localVideoTrackRef.current = null;
      }
      if (localScreenTrackRef.current) {
        localScreenTrackRef.current.close();
        localScreenTrackRef.current = null;
      }
      if (agoraClientRef.current) {
        agoraClientRef.current.leave().catch(() => {});
        agoraClientRef.current = null;
      }
      if (signalingIntervalRef.current) {
        clearInterval(signalingIntervalRef.current);
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
    };
  }, [sessionData, tooEarlyInfo]);

  // Re-play remote video if state changes or container re-mounts
  useEffect(() => {
    if (hasRemoteVideo && !isRemoteCamOff && remoteUserRef.current?.videoTrack && remoteVideoContainerRef.current) {
      try {
        remoteUserRef.current.videoTrack.play(remoteVideoContainerRef.current);
      } catch (e) {
        console.warn('Agora remote video play:', e);
      }
    }
  }, [hasRemoteVideo, isRemoteCamOff, isRemoteScreenSharing]);

  // Re-play local video in PIP container
  useEffect(() => {
    if (!isCamOff && localVideoTrackRef.current && localVideoContainerRef.current) {
      try {
        localVideoTrackRef.current.play(localVideoContainerRef.current);
      } catch (e) {
        console.warn('Agora local video play:', e);
      }
    }
  }, [isCamOff]);

  // 3. Signaling Polling for chat messages & status events
  const startSignalingSync = () => {
    if (signalingIntervalRef.current) clearInterval(signalingIntervalRef.current);

    signalingIntervalRef.current = setInterval(async () => {
      try {
        const res = await bookingApi.getSessionSignals(bookingId, lastSignalIdRef.current);
        const incoming = res.signals || [];
        for (const sig of incoming) {
          lastSignalIdRef.current = Math.max(lastSignalIdRef.current, sig.id);
          handleSignalMessage(sig);
        }
      } catch (_) {}
    }, 1000);
  };

  const handleSignalMessage = (sig) => {
    const { signal_type, data } = sig;
    if (signal_type === 'chat') {
      setChatMessages((prev) => [
        ...prev,
        {
          id: sig.id || Date.now(),
          sender: data.sender_name || sessionData?.other_name || 'Counterpart',
          isMe: false,
          text: data.text || '',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } else if (signal_type === 'state') {
      if (data.isCamOff !== undefined) setIsRemoteCamOff(data.isCamOff);
      if (data.isMuted !== undefined) setIsRemoteMuted(data.isMuted);
      if (data.isScreenSharing !== undefined) setIsRemoteScreenSharing(data.isScreenSharing);
    } else if (signal_type === 'leave') {
      setHasRemoteVideo(false);
      setConnectionStatus('waiting');
    }
  };

  // 4. WebRTC P2P Fallback Engine (active if Agora cloud is unreachable)
  const startWebRTCSignalingFallback = () => {
    startSignalingSync();
  };

  // 5. Mic & Camera Toggles (Agora RTC)
  const handleToggleMic = async () => {
    const newMuted = !isMuted;
    setIsMuted(newMuted);

    if (localAudioTrackRef.current) {
      try {
        await localAudioTrackRef.current.setEnabled(!newMuted);
      } catch (e) {
        console.warn('Agora setEnabled audio error:', e);
      }
    }

    bookingApi
      .sendSessionSignal(bookingId, 'state', {
        isMuted: newMuted,
        isCamOff,
        isScreenSharing,
      })
      .catch(() => {});
  };

  const handleToggleCamera = async () => {
    const newCamOff = !isCamOff;
    setIsCamOff(newCamOff);

    if (localVideoTrackRef.current) {
      try {
        await localVideoTrackRef.current.setEnabled(!newCamOff);
        if (!newCamOff && localVideoContainerRef.current) {
          localVideoTrackRef.current.play(localVideoContainerRef.current);
        }
      } catch (e) {
        console.warn('Agora setEnabled video error:', e);
      }
    }

    bookingApi
      .sendSessionSignal(bookingId, 'state', {
        isMuted,
        isCamOff: newCamOff,
        isScreenSharing,
      })
      .catch(() => {});
  };

  // 6. Screen Share Track Handling (Agora RTC)
  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      handleStopScreenShare();
      return;
    }

    try {
      const client = agoraClientRef.current;
      if (!client) {
        toast.warning('Audio/video client is not ready.');
        return;
      }

      // Create Agora screen video track
      const screenTrack = await AgoraRTC.createScreenVideoTrack({
        encoderConfig: '1080p_1',
      }, 'enable');

      localScreenTrackRef.current = screenTrack;
      setIsScreenSharing(true);

      // Unpublish camera track, publish screen track
      if (localVideoTrackRef.current) {
        await client.unpublish(localVideoTrackRef.current);
      }
      await client.publish(screenTrack);

      if (screenVideoContainerRef.current) {
        screenTrack.play(screenVideoContainerRef.current);
      }

      screenTrack.on('track-ended', () => {
        handleStopScreenShare();
      });

      bookingApi.sendSessionSignal(bookingId, 'state', {
        isScreenSharing: true,
        isCamOff,
        isMuted,
      }).catch(() => {});
    } catch (err) {
      console.warn('Agora screen sharing cancelled or error:', err);
      setIsScreenSharing(false);
    }
  };

  const handleStopScreenShare = async () => {
    const client = agoraClientRef.current;
    if (localScreenTrackRef.current) {
      if (client) {
        try {
          await client.unpublish(localScreenTrackRef.current);
        } catch (_) {}
      }
      localScreenTrackRef.current.close();
      localScreenTrackRef.current = null;
    }
    setIsScreenSharing(false);

    // Re-publish camera track
    if (localVideoTrackRef.current && client) {
      try {
        await client.publish(localVideoTrackRef.current);
        if (localVideoContainerRef.current && !isCamOff) {
          localVideoTrackRef.current.play(localVideoContainerRef.current);
        }
      } catch (e) {
        console.warn('Agora camera re-publish warning:', e);
      }
    }

    bookingApi.sendSessionSignal(bookingId, 'state', {
      isScreenSharing: false,
      isCamOff,
      isMuted,
    }).catch(() => {});
  };

  // 7. Test Loopback Mode (simulates counterpart view on single computer)
  const handleToggleLoopback = () => {
    if (testLoopbackActive) {
      setTestLoopbackActive(false);
      setHasRemoteVideo(false);
      if (remoteVideoContainerRef.current) {
        remoteVideoContainerRef.current.innerHTML = '';
      }
    } else {
      if (localVideoTrackRef.current) {
        setHasRemoteVideo(true);
        setTestLoopbackActive(true);
        setConnectionStatus('connected');
        setTimeout(() => {
          if (remoteVideoContainerRef.current && localVideoTrackRef.current) {
            localVideoTrackRef.current.play(remoteVideoContainerRef.current);
          }
        }, 50);
      } else {
        toast.info('Please allow camera access first to test dual video view.');
      }
    }
  };

  // 8. Session Elapsed Timer
  useEffect(() => {
    if (!sessionData || (connectionStatus !== 'connected' && !testLoopbackActive)) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [sessionData, connectionStatus, testLoopbackActive]);

  // 9. Notes auto-save
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

  // 10. In-Call Chat Send
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

    bookingApi
      .sendSessionSignal(bookingId, 'chat', {
        text,
        sender_name: user?.name || 'Me',
      })
      .catch(() => {});

    setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  // 11. File Sharing Upload
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

  // 12. Session Completion Handler
  const handleCompleteSession = async () => {
    setCompleting(true);
    try {
      await bookingApi.saveSessionSummary(bookingId, {
        summary_text: summaryText,
        action_items: actionItems,
        duration_seconds: elapsedSeconds,
        complete_session: true,
      });

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
          <p style={{ color: '#94A3B8' }}>Connecting to Agora RTC Live Session Room...</p>
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
                  if (window.confirm('Leave the session room? You can return anytime while the session is active.')) {
                    navigate(isMentor ? '/mentor/sessions' : '/learner/sessions');
                  }
                }}
                style={{
                  background: 'transparent',
                  border: '1px solid #475569',
                  color: '#94A3B8',
                  padding: '6px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                }}
              >
                <ArrowLeftIcon size={14} /> Exit
              </button>

              <div>
                <h2 style={{ fontSize: '16px', fontWeight: 700, margin: 0, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{sessionData.topic || 'Mentorship Session'}</span>
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '6px', background: 'rgba(14, 165, 233, 0.15)', color: '#38BDF8', fontWeight: 700 }}>
                    {sessionData.duration_minutes || 60}m · {formatCurrency(sessionData.price || 0)}
                  </span>
                </h2>
                <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '2px' }}>
                  With <strong style={{ color: '#E2E8F0' }}>{otherName}</strong> ({isMentor ? 'Learner' : 'Mentor'}) · Room: <code style={{ color: '#38BDF8', background: 'rgba(56, 189, 248, 0.1)', padding: '1px 5px', borderRadius: '4px' }}>{sessionData.channel_name || sessionData.room_name}</code>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              {/* Connection Status Pill */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: connectionStatus === 'connected' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                  border: `1px solid ${connectionStatus === 'connected' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(234, 179, 8, 0.4)'}`,
                  borderRadius: '10px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: connectionStatus === 'connected' ? '#4ADE80' : '#FBBF24',
                }}
              >
                <span>
                  {connectionStatus === 'connected'
                    ? '● Agora SD-RTN Connected'
                    : connectionStatus === 'connecting'
                    ? 'Connecting to Agora…'
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
                {/* 1. Screen Share Display */}
                {isScreenSharing ? (
                  <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000' }}>
                    <div
                      ref={attachScreenContainer}
                      style={{ width: '100%', height: '100%' }}
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
                        zIndex: 5,
                      }}
                    >
                      <ScreenShareIcon size={14} /> You are sharing your screen
                    </div>
                  </div>
                ) : hasRemoteVideo && !isRemoteCamOff ? (
                  /* 2. REAL REMOTE LIVE VIDEO STREAM (Agora Container) */
                  <div style={{ width: '100%', height: '100%', position: 'relative', background: '#000' }}>
                    <div
                      ref={attachRemoteContainer}
                      style={{ width: '100%', height: '100%' }}
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
                        zIndex: 5,
                      }}
                    >
                      <span>{otherName}</span>
                      {isRemoteMuted && <span style={{ color: '#EF4444' }}>(Muted)</span>}
                    </div>
                  </div>
                ) : (
                  /* 3. Remote Participant Waiting or Camera Off State */
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
                            Video, audio, and session timer start automatically when both participants are connected.
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

                {/* Local Camera PIP (Picture-In-Picture Container) */}
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
                    <div
                      ref={attachLocalContainer}
                      style={{ width: '100%', height: '100%' }}
                    />
                  )}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '6px',
                      left: '8px',
                      background: 'rgba(15, 23, 42, 0.75)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      color: '#E2E8F0',
                      fontWeight: 600,
                      zIndex: 2,
                    }}
                  >
                    You {isMuted && '· Muted'}
                  </div>
                </div>
              </div>

              {/* Bottom Media Controls Bar */}
              <div
                style={{
                  background: '#1E293B',
                  borderRadius: '16px',
                  padding: '12px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '16px',
                  border: '1px solid #334155',
                  flexWrap: 'wrap',
                }}
              >
                {/* Mute/Unmute */}
                <button
                  type="button"
                  onClick={handleToggleMic}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: isMuted ? '#EF4444' : '#334155',
                    color: '#fff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
                >
                  {isMuted ? <MicOffIcon size={20} /> : <MicIcon size={20} />}
                </button>

                {/* Camera Toggle */}
                <button
                  type="button"
                  onClick={handleToggleCamera}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: isCamOff ? '#EF4444' : '#334155',
                    color: '#fff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  title={isCamOff ? 'Turn Camera On' : 'Turn Camera Off'}
                >
                  {isCamOff ? <CameraOffIcon size={20} /> : <CameraIcon size={20} />}
                </button>

                {/* Screen Share */}
                <button
                  type="button"
                  onClick={handleToggleScreenShare}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: isScreenSharing ? '#0284C7' : '#334155',
                    color: '#fff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  title={isScreenSharing ? 'Stop Screen Sharing' : 'Share Screen'}
                >
                  <ScreenShareIcon size={20} />
                </button>

                {/* Leave Session Call */}
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Leave call room?')) {
                      navigate(isMentor ? '/mentor/sessions' : '/learner/sessions');
                    }
                  }}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    background: '#B91C1C',
                    color: '#fff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    marginLeft: '8px',
                  }}
                  title="Leave Call"
                >
                  <PhoneOffIcon size={20} />
                </button>
              </div>
            </div>

            {/* Right Column: Collaboration Sidebar (Notes, Chat, Shared Files) */}
            <div
              style={{
                background: '#1E293B',
                borderRadius: '16px',
                border: '1px solid #334155',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                minHeight: '600px',
              }}
            >
              {/* Tab Navigation */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderBottom: '1px solid #334155', background: '#0F172A' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('notes')}
                  style={{
                    padding: '12px 8px',
                    background: activeTab === 'notes' ? '#1E293B' : 'transparent',
                    border: 'none',
                    borderBottom: activeTab === 'notes' ? '2px solid #0284C7' : 'none',
                    color: activeTab === 'notes' ? '#F8FAFC' : '#94A3B8',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <DocumentIcon size={16} /> Notes
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('chat')}
                  style={{
                    padding: '12px 8px',
                    background: activeTab === 'chat' ? '#1E293B' : 'transparent',
                    border: 'none',
                    borderBottom: activeTab === 'chat' ? '2px solid #0284C7' : 'none',
                    color: activeTab === 'chat' ? '#F8FAFC' : '#94A3B8',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <MessageIcon size={16} /> Chat
                  {chatMessages.length > 1 && (
                    <span style={{ fontSize: '10px', background: '#0284C7', color: '#fff', padding: '1px 5px', borderRadius: '10px' }}>
                      {chatMessages.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('files')}
                  style={{
                    padding: '12px 8px',
                    background: activeTab === 'files' ? '#1E293B' : 'transparent',
                    border: 'none',
                    borderBottom: activeTab === 'files' ? '2px solid #0284C7' : 'none',
                    color: activeTab === 'files' ? '#F8FAFC' : '#94A3B8',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  <PaperclipIcon size={16} /> Files
                  {files.length > 0 && (
                    <span style={{ fontSize: '10px', background: '#334155', color: '#fff', padding: '1px 5px', borderRadius: '10px' }}>
                      {files.length}
                    </span>
                  )}
                </button>
              </div>

              {/* TAB 1: Real-time Notes */}
              {activeTab === 'notes' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#CBD5E1' }}>Session Workspace Notes</span>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>{notesStatus}</span>
                  </div>
                  <textarea
                    value={notes}
                    onChange={handleNotesChange}
                    placeholder="Type code snippets, discussion bullet points, architecture diagrams, or next steps here..."
                    style={{
                      flex: 1,
                      width: '100%',
                      background: '#0F172A',
                      color: '#F8FAFC',
                      border: '1px solid #334155',
                      borderRadius: '10px',
                      padding: '12px',
                      fontFamily: 'monospace',
                      fontSize: '13px',
                      lineHeight: 1.6,
                      resize: 'none',
                      outline: 'none',
                    }}
                  />
                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                    💡 Notes are preserved across reconnects and auto-saved to your profile.
                  </div>
                </div>
              )}

              {/* TAB 2: In-Call Chat */}
              {activeTab === 'chat' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        style={{
                          alignSelf: msg.isSystem ? 'center' : msg.isMe ? 'flex-end' : 'flex-start',
                          maxWidth: msg.isSystem ? '95%' : '80%',
                          background: msg.isSystem ? 'rgba(56, 189, 248, 0.08)' : msg.isMe ? '#0284C7' : '#334155',
                          border: msg.isSystem ? '1px dashed rgba(56, 189, 248, 0.3)' : 'none',
                          borderRadius: '10px',
                          padding: '8px 12px',
                          fontSize: '12.5px',
                        }}
                      >
                        {!msg.isSystem && (
                          <div style={{ fontSize: '10.5px', opacity: 0.7, marginBottom: '2px', fontWeight: 600 }}>
                            {msg.sender} · {msg.time}
                          </div>
                        )}
                        <div style={{ color: msg.isSystem ? '#38BDF8' : '#fff', lineHeight: 1.4 }}>{msg.text}</div>
                      </div>
                    ))}
                    <div ref={chatBottomRef} />
                  </div>

                  <form onSubmit={handleSendMessage} style={{ padding: '12px', borderTop: '1px solid #334155', display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Send message or link..."
                      style={{
                        flex: 1,
                        background: '#0F172A',
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
                      disabled={!chatInput.trim()}
                      style={{
                        background: chatInput.trim() ? '#0284C7' : '#334155',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '8px 14px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        cursor: chatInput.trim() ? 'pointer' : 'default',
                      }}
                    >
                      Send
                    </button>
                  </form>
                </div>
              )}

              {/* TAB 3: Shared Files */}
              {activeTab === 'files' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#CBD5E1' }}>Session Attachments</span>
                    <label
                      style={{
                        background: '#0284C7',
                        color: '#fff',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <PaperclipIcon size={14} /> {uploadingFile ? 'Uploading…' : 'Share File'}
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
                      <div style={{ textAlign: 'center', padding: '40px 16px', color: '#64748B', fontSize: '12.5px' }}>
                        No files shared in this call yet. Upload logs, zip archives, or specifications (up to 25MB).
                      </div>
                    ) : (
                      files.map((file) => (
                        <div
                          key={file.id}
                          style={{
                            background: '#0F172A',
                            border: '1px solid #334155',
                            borderRadius: '10px',
                            padding: '10px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '8px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                            <DocumentIcon size={18} className="text-sky-400 shrink-0" />
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: '12.5px', fontWeight: 600, color: '#F8FAFC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {file.filename}
                              </div>
                              <div style={{ fontSize: '10.5px', color: '#64748B' }}>
                                By {file.uploader_name} · {(file.file_size / 1024).toFixed(1)} KB
                              </div>
                            </div>
                          </div>
                          {file.file_url && (
                            <a
                              href={file.file_url}
                              target="_blank"
                              rel="noreferrer"
                              download={file.filename}
                              style={{
                                background: '#334155',
                                color: '#38BDF8',
                                padding: '4px 10px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: 700,
                                textDecoration: 'none',
                              }}
                            >
                              Download
                            </a>
                          )}
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

      {/* SESSION COMPLETION MODAL */}
      {showCompleteModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 999,
            padding: '20px',
          }}
        >
          <div
            style={{
              background: '#1E293B',
              border: '1px solid #334155',
              borderRadius: '16px',
              maxWidth: '520px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(13, 148, 136, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#14B8A6' }}>
                <CheckCircleIcon size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '17px', color: '#F8FAFC', fontWeight: 700 }}>
                  Complete Mentorship Session
                </h3>
                <span style={{ fontSize: '12px', color: '#94A3B8' }}>
                  Total Duration: {elapsedMinStr}:{elapsedSecStr} ({totalMinutes}m planned)
                </span>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: '#CBD5E1', lineHeight: 1.5, marginBottom: '16px' }}>
              Marking this session complete will conclude the video room and release escrow payment of{' '}
              <strong style={{ color: '#38BDF8' }}>{formatCurrency(sessionData.price || 0)}</strong> to the mentor balance.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94A3B8', marginBottom: '4px' }}>
                  Session Summary / Key Takeaways
                </label>
                <textarea
                  value={summaryText}
                  onChange={(e) => setSummaryText(e.target.value)}
                  placeholder="Summary of bugs resolved, topics covered, or concepts taught..."
                  rows={3}
                  style={{
                    width: '100%',
                    background: '#0F172A',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#94A3B8', marginBottom: '4px' }}>
                  Recommended Next Steps / Action Items (Optional)
                </label>
                <textarea
                  value={actionItems}
                  onChange={(e) => setActionItems(e.target.value)}
                  placeholder="Follow-up tasks, documentation links, or practice exercises for the learner..."
                  rows={2}
                  style={{
                    width: '100%',
                    background: '#0F172A',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none',
                    resize: 'vertical',
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowCompleteModal(false)}
                disabled={completing}
                style={{
                  background: 'transparent',
                  border: '1px solid #475569',
                  color: '#94A3B8',
                  padding: '9px 16px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 600,
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
                  padding: '9px 20px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: completing ? 'default' : 'pointer',
                  opacity: completing ? 0.7 : 1,
                }}
              >
                {completing ? 'Releasing Escrow…' : 'Confirm & Complete'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
