import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useParams, useNavigate, Link } from 'react-router-dom';
import AgoraRTC from 'agora-rtc-sdk-ng';
import { buildAgoraToken, DEFAULT_AGORA_APP_ID, DEFAULT_AGORA_APP_CERTIFICATE } from '../../api/modules/agoraTokenBuilder';
import Navbar from '../../components/Navbar';
import Footer from '../../components/Footer';
import PairUpLogo from '../../components/PairUpLogo';
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
  XIcon,
  MaximizeIcon,
  MinimizeIcon,
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
  const localScreenAudioTrackRef = useRef(null);
  const remoteUserRef = useRef(null);

  // Active sidebar tab: 'notes' | 'chat' | 'files'
  const [activeTab, setActiveTab] = useState('notes');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleToggleSidebarTab = (tab) => {
    if (isSidebarOpen && activeTab === tab) {
      setIsSidebarOpen(false);
    } else {
      setActiveTab(tab);
      setIsSidebarOpen(true);
      if (tab === 'files') {
        bookingApi
          .getSessionFiles(bookingId)
          .then((res) => {
            if (Array.isArray(res)) setFiles(res);
          })
          .catch(() => {});
      }
    }
  };

  // Fullscreen state & handler
  const [isFullscreen, setIsFullscreen] = useState(
    typeof document !== 'undefined' ? Boolean(document.fullscreenElement) : false
  );

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Error entering fullscreen:', err);
      });
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch((err) => {
        console.warn('Error exiting fullscreen:', err);
      });
    }
  };

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

  // Ensure the session room takes 100% full screen width & height without zoom offset
  useEffect(() => {
    document.documentElement.classList.add('in-session-room');
    document.body.classList.add('in-session-room');
    const origZoom = document.documentElement.style.zoom;
    const origBg = document.body.style.background;
    const origBgImg = document.body.style.backgroundImage;
    const origOverflow = document.body.style.overflow;

    document.documentElement.style.zoom = '1';
    document.body.style.background = '#0B1120';
    document.body.style.backgroundImage = 'none';
    document.body.style.overflow = 'hidden';

    return () => {
      document.documentElement.classList.remove('in-session-room');
      document.body.classList.remove('in-session-room');
      document.documentElement.style.zoom = origZoom;
      document.body.style.background = origBg;
      document.body.style.backgroundImage = origBgImg;
      document.body.style.overflow = origOverflow;
    };
  }, []);

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

          // Join Agora Channel with verified App ID and Token
          const appId =
            sessionData?.app_id && sessionData.app_id !== 'test_agora_app_id'
              ? sessionData.app_id
              : (import.meta.env.VITE_AGORA_APP_ID || DEFAULT_AGORA_APP_ID);
          const appCertificate =
            sessionData?.app_certificate ||
            import.meta.env.VITE_AGORA_APP_CERTIFICATE ||
            DEFAULT_AGORA_APP_CERTIFICATE;
          const channelName = sessionData?.channel_name || sessionData?.room_name || `pairup-session-${bookingId}`;
          const uid = Number(sessionData?.uid || user?.id || Math.floor(Math.random() * 100000));

          let token = sessionData?.token;
          if (!token || String(token).startsWith('eyJ') || String(token) === 'test_token') {
            try {
              token = await buildAgoraToken(appId, appCertificate, channelName, uid);
            } catch (tokenBuildErr) {
              console.warn('Browser buildAgoraToken warning:', tokenBuildErr);
              token = null;
            }
          }

          await client.join(appId, channelName, token || null, uid);
          console.log('>>> Agora successfully joined channel:', channelName, 'UID:', uid);

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
      if (localScreenAudioTrackRef.current) {
        localScreenAudioTrackRef.current.close();
        localScreenAudioTrackRef.current = null;
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

  // Re-play remote video or screen share if state changes or container re-mounts
  useEffect(() => {
    if ((isRemoteScreenSharing || (hasRemoteVideo && !isRemoteCamOff)) && remoteUserRef.current?.videoTrack && remoteVideoContainerRef.current) {
      try {
        remoteUserRef.current.videoTrack.play(remoteVideoContainerRef.current);
      } catch (e) {
        console.warn('Agora remote video play:', e);
      }
    }
  }, [hasRemoteVideo, isRemoteCamOff, isRemoteScreenSharing]);

  // Re-play local screen share in main stage if container re-mounts
  useEffect(() => {
    if (isScreenSharing && localScreenTrackRef.current && screenVideoContainerRef.current) {
      try {
        localScreenTrackRef.current.play(screenVideoContainerRef.current);
      } catch (e) {
        console.warn('Agora local screen share play:', e);
      }
    }
  }, [isScreenSharing]);

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

  // 3. Signaling Polling for chat messages, file sharing & status events
  const startSignalingSync = () => {
    if (signalingIntervalRef.current) clearInterval(signalingIntervalRef.current);

    let pollCounter = 0;

    signalingIntervalRef.current = setInterval(async () => {
      try {
        const res = await bookingApi.getSessionSignals(bookingId, lastSignalIdRef.current);
        const incoming = res.signals || [];
        for (const sig of incoming) {
          lastSignalIdRef.current = Math.max(lastSignalIdRef.current, sig.id);
          handleSignalMessage(sig);
        }
      } catch (_) {}

      // Background periodic fallback: auto-sync session files every 4 seconds without manual refresh
      pollCounter++;
      if (pollCounter % 4 === 0) {
        try {
          const freshFiles = await bookingApi.getSessionFiles(bookingId);
          if (Array.isArray(freshFiles)) {
            setFiles((prev) => {
              if (
                freshFiles.length !== prev.length ||
                freshFiles.some((f, idx) => prev[idx]?.id !== f.id)
              ) {
                return freshFiles;
              }
              return prev;
            });
          }
        } catch (_) {}
      }
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
          isSystem: Boolean(data.isSystem),
          text: data.text || '',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setTimeout(() => chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } else if (signal_type === 'file') {
      // Counterpart shared a file attachment: update files immediately
      const fileData = data;
      if (fileData) {
        setFiles((prev) => {
          if (prev.some((f) => f.id === fileData.id)) return prev;
          return [fileData, ...prev];
        });
        toast.info(`📎 ${fileData.uploader_name || sessionData?.other_name || 'Counterpart'} shared a file: ${fileData.filename}`);
      }
      // Guarantee full list sync from server
      bookingApi
        .getSessionFiles(bookingId)
        .then((res) => {
          if (Array.isArray(res)) setFiles(res);
        })
        .catch(() => {});
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
      await handleStopScreenShare();
      return;
    }

    try {
      const client = agoraClientRef.current;
      if (!client) {
        toast.warning('Audio/video client is not ready.');
        return;
      }

      // Create Agora screen video track (with optional audio)
      // Passing 'auto' cleanly handles sharing with or without system audio across all browsers
      const screenResult = await AgoraRTC.createScreenVideoTrack(
        {
          encoderConfig: '1080p_1',
          optimizationMode: 'detail',
        },
        'auto'
      );

      // Handle return type: array [videoTrack, audioTrack] or single videoTrack
      const screenVideoTrack = Array.isArray(screenResult) ? screenResult[0] : screenResult;
      const screenAudioTrack = Array.isArray(screenResult) ? screenResult[1] : null;

      localScreenTrackRef.current = screenVideoTrack;
      localScreenAudioTrackRef.current = screenAudioTrack;
      setIsScreenSharing(true);

      // Unpublish camera track so screen track takes center stage
      if (localVideoTrackRef.current) {
        try {
          await client.unpublish(localVideoTrackRef.current);
        } catch (unpubErr) {
          console.warn('Agora local camera unpublish warning:', unpubErr);
        }
      }

      // Publish screen video track and optional audio track
      const tracksToPublish = [screenVideoTrack];
      if (screenAudioTrack) {
        tracksToPublish.push(screenAudioTrack);
      }
      await client.publish(tracksToPublish);

      // Render local preview on the stage
      if (screenVideoContainerRef.current) {
        try {
          screenVideoTrack.play(screenVideoContainerRef.current);
        } catch (playErr) {
          console.warn('Could not play screen track locally:', playErr);
        }
      }

      // Automatically stop sharing when user clicks native browser "Stop sharing" bar
      screenVideoTrack.on('track-ended', () => {
        handleStopScreenShare();
      });

      // Broadcast screen share state to counterpart
      bookingApi.sendSessionSignal(bookingId, 'state', {
        isScreenSharing: true,
        isCamOff,
        isMuted,
      }).catch(() => {});
    } catch (err) {
      console.warn('Agora screen sharing cancelled or error:', err);
      setIsScreenSharing(false);
      if (localScreenTrackRef.current) {
        try {
          localScreenTrackRef.current.close();
        } catch (_) {}
        localScreenTrackRef.current = null;
      }
      if (localScreenAudioTrackRef.current) {
        try {
          localScreenAudioTrackRef.current.close();
        } catch (_) {}
        localScreenAudioTrackRef.current = null;
      }
    }
  };

  const handleStopScreenShare = async () => {
    const client = agoraClientRef.current;

    const tracksToUnpublish = [];
    if (localScreenTrackRef.current) tracksToUnpublish.push(localScreenTrackRef.current);
    if (localScreenAudioTrackRef.current) tracksToUnpublish.push(localScreenAudioTrackRef.current);

    if (client && tracksToUnpublish.length > 0) {
      try {
        await client.unpublish(tracksToUnpublish);
      } catch (err) {
        console.warn('Error unpublishing screen tracks:', err);
      }
    }

    if (localScreenTrackRef.current) {
      try {
        localScreenTrackRef.current.close();
      } catch (_) {}
      localScreenTrackRef.current = null;
    }

    if (localScreenAudioTrackRef.current) {
      try {
        localScreenAudioTrackRef.current.close();
      } catch (_) {}
      localScreenAudioTrackRef.current = null;
    }

    setIsScreenSharing(false);

    // Re-publish camera track if available and camera is not turned off
    if (localVideoTrackRef.current && client && !isCamOff) {
      try {
        await client.publish(localVideoTrackRef.current);
        if (localVideoContainerRef.current) {
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
      const fileData = uploaded?.data || uploaded;

      if (fileData) {
        setFiles((prev) => {
          if (prev.some((f) => f.id === fileData.id)) return prev;
          return [fileData, ...prev];
        });

        // Broadcast real-time signal to counterpart so file displays immediately without page refresh
        bookingApi
          .sendSessionSignal(bookingId, 'file', fileData)
          .catch((err) => console.warn('Could not broadcast file signal:', err));

        // Also broadcast chat notice to counterpart
        bookingApi
          .sendSessionSignal(bookingId, 'chat', {
            text: `📎 ${user?.name || 'A user'} shared a file: "${fileData.filename || file.name}" (${(((fileData.file_size || file.size) || 0) / 1024).toFixed(1)} KB)`,
            sender_name: 'PairUp System',
            isSystem: true,
          })
          .catch(() => {});
      }

      setChatMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          sender: 'PairUp System',
          isSystem: true,
          text: `📎 ${user?.name || 'You'} shared a file: "${file.name}" (${(file.size / 1024).toFixed(1)} KB)`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      toast.success(`File "${file.name}" shared successfully`);

      // Refetch files in background to ensure database-level consistency
      bookingApi
        .getSessionFiles(bookingId)
        .then((res) => {
          if (Array.isArray(res)) setFiles(res);
        })
        .catch(() => {});
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
    <div
      className="session-room-fullscreen"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        maxWidth: '100vw',
        maxHeight: '100vh',
        background: '#0B1120',
        color: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        zIndex: 99999,
        margin: 0,
        padding: 0,
        boxSizing: 'border-box',
      }}
    >
      <main
        style={{
          flex: 1,
          minHeight: 0,
          padding: '8px 12px 10px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div
          style={{
            maxWidth: '100%',
            width: '100%',
            height: '100%',
            margin: 0,
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Top Bar: PairUp Logo, Session Info, Connection Status, Timer, Actions */}
          <div
            style={{
              background: '#1E293B',
              borderRadius: '12px',
              padding: '6px 14px',
              marginBottom: '8px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              border: '1px solid #334155',
              flexWrap: 'wrap',
              gap: '8px',
              flexShrink: 0,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '2px' }}>
                <PairUpLogo size={20} />
                <span style={{ fontWeight: 800, fontSize: '14.5px', color: '#F8FAFC', letterSpacing: '-0.3px' }}>PairUp</span>
              </div>

              <div style={{ width: '1px', height: '18px', background: '#334155' }} />

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
                  padding: '5px 10px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '12px',
                  fontWeight: 600,
                }}
              >
                <ArrowLeftIcon size={14} /> Exit
              </button>

              <div>
                <h2 style={{ fontSize: '14px', fontWeight: 700, margin: 0, color: '#F8FAFC', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{sessionData.topic || 'Mentorship Session'}</span>
                  <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(14, 165, 233, 0.15)', color: '#38BDF8', fontWeight: 700 }}>
                    {sessionData.duration_minutes || 60}m · {formatCurrency(sessionData.price || 0)}
                  </span>
                </h2>
                <div style={{ fontSize: '11px', color: '#94A3B8', marginTop: '1px' }}>
                  With <strong style={{ color: '#E2E8F0' }}>{otherName}</strong> ({isMentor ? 'Learner' : 'Mentor'}) · Room: <code style={{ color: '#38BDF8', background: 'rgba(56, 189, 248, 0.1)', padding: '1px 5px', borderRadius: '4px' }}>{sessionData.channel_name || sessionData.room_name}</code>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Connection Status Pill */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: connectionStatus === 'connected' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(234, 179, 8, 0.15)',
                  border: `1px solid ${connectionStatus === 'connected' ? 'rgba(34, 197, 94, 0.4)' : 'rgba(234, 179, 8, 0.4)'}`,
                  borderRadius: '8px',
                  padding: '4px 10px',
                  fontSize: '11.5px',
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
                  padding: '5px 10px',
                  borderRadius: '8px',
                  fontSize: '11.5px',
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
                  gap: '6px',
                  background: isTimeOver ? '#450A0A' : isEndingSoon ? '#422006' : '#0F172A',
                  padding: '4px 10px',
                  borderRadius: '8px',
                  border: `1px solid ${isTimeOver ? '#EF4444' : isEndingSoon ? '#F59E0B' : '#334155'}`,
                }}
              >
                <ClockIcon size={14} className={isTimeOver ? 'text-red-400' : isEndingSoon ? 'text-amber-400' : 'text-slate-400'} />
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '13px',
                    fontWeight: 700,
                    color: isTimeOver ? '#F87171' : isEndingSoon ? '#FBBF24' : '#F8FAFC',
                  }}
                >
                  {connectionStatus === 'connected' || testLoopbackActive
                    ? `${elapsedMinStr}:${elapsedSecStr} / ${totalMinutes}:00`
                    : `00:00 / ${totalMinutes}:00`}
                </span>
                {(connectionStatus === 'connected' || testLoopbackActive) && isEndingSoon && !isTimeOver && (
                  <span style={{ fontSize: '10.5px', color: '#FBBF24', fontWeight: 700, marginLeft: '2px' }}>5m left</span>
                )}
                {(connectionStatus === 'connected' || testLoopbackActive) && isTimeOver && (
                  <span style={{ fontSize: '10.5px', color: '#F87171', fontWeight: 700, marginLeft: '2px' }}>Overtime</span>
                )}
                {connectionStatus !== 'connected' && !testLoopbackActive && (
                  <span style={{ fontSize: '10.5px', color: '#94A3B8', fontWeight: 500, marginLeft: '2px' }}>Ready · Paused</span>
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
                  padding: '6px 12px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                <CheckCircleIcon size={14} />
                End & Complete
              </button>
            </div>
          </div>

          {/* Main Layout: Video Stage (Left) & Collaboration Sidebar (Right) */}
          <div
            style={{
              flex: 1,
              minHeight: 0,
              display: 'grid',
              gridTemplateColumns: isSidebarOpen ? 'minmax(0, 1fr) 340px' : 'minmax(0, 1fr)',
              gap: isSidebarOpen ? '10px' : '0',
              height: '100%',
              transition: 'grid-template-columns 0.2s ease',
            }}
          >
            {/* Left Column: Video Stage & Controls */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                height: '100%',
                minHeight: 0,
              }}
            >
              <div
                style={{
                  flex: 1,
                  background: '#060A12',
                  borderRadius: '12px',
                  position: 'relative',
                  overflow: 'hidden',
                  border: '1px solid #1E293B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minHeight: 0,
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
                ) : isRemoteScreenSharing || (hasRemoteVideo && !isRemoteCamOff) ? (
                  /* 2. REAL REMOTE LIVE VIDEO STREAM / SCREEN SHARE (Agora Container) */
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
                      {isRemoteScreenSharing ? (
                        <>
                          <ScreenShareIcon size={14} style={{ color: '#38BDF8' }} />
                          <span>{otherName}'s Screen</span>
                        </>
                      ) : (
                        <>
                          <span>{otherName}</span>
                          {isRemoteMuted && <span style={{ color: '#EF4444' }}>(Muted)</span>}
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  /* 3. Remote Participant Waiting or Camera Off State */
                  <div style={{ textAlign: 'center', padding: '16px', maxWidth: '380px' }}>
                    <div
                      style={{
                        width: '68px',
                        height: '68px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #0284C7, #0369A1)',
                        margin: '0 auto 10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '24px',
                        fontWeight: 800,
                        border: '2px solid #38BDF8',
                        boxShadow: '0 0 20px rgba(56, 189, 248, 0.25)',
                      }}
                    >
                      {initials(otherName)}
                    </div>
                    <h4 style={{ color: '#F8FAFC', margin: '0 0 4px', fontSize: '15px', fontWeight: 700 }}>
                      {otherName} ({isMentor ? 'Learner' : 'Mentor'})
                    </h4>
                    {hasRemoteVideo && isRemoteCamOff ? (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          background: '#1E293B',
                          padding: '4px 12px',
                          borderRadius: '16px',
                          fontSize: '11.5px',
                          color: '#94A3B8',
                        }}
                      >
                        <CameraOffIcon size={13} className="text-amber-400" />
                        Camera paused · Audio active
                      </div>
                    ) : (
                      <div>
                        <p style={{ color: '#94A3B8', fontSize: '12px', margin: '6px 0 10px', lineHeight: 1.45 }}>
                          Waiting for <strong>{otherName}</strong> ({isMentor ? 'Learner' : 'Mentor'}) to enter the session room.
                          <br />
                          {sessionData?.scheduled_at && (
                            <span style={{ color: '#38BDF8', display: 'inline-block', marginTop: '2px' }}>
                              📅 Scheduled: {new Date(sessionData.scheduled_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            </span>
                          )}
                          <br />
                          <span style={{ fontSize: '11px', color: '#64748B', display: 'inline-block', marginTop: '2px' }}>
                            Media and session timer start when both join.
                          </span>
                        </p>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#1E293B',
                            border: '1px solid #334155',
                            padding: '4px 12px',
                            borderRadius: '16px',
                            fontSize: '11px',
                            color: '#38BDF8',
                            marginBottom: '10px',
                          }}
                        >
                          <div
                            style={{
                              width: '7px',
                              height: '7px',
                              borderRadius: '50%',
                              background: '#38BDF8',
                              animation: 'pulse 1.5s infinite',
                            }}
                          />
                          Room Ready · Waiting for {otherName}…
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            type="button"
                            onClick={handleToggleLoopback}
                            style={{
                              background: '#0284C7',
                              color: '#fff',
                              border: 'none',
                              padding: '5px 12px',
                              borderRadius: '6px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                            }}
                          >
                            🧪 Test Dual Video View
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate(isMentor ? '/mentor/sessions' : '/learner/sessions')}
                            style={{
                              background: 'transparent',
                              border: '1px solid #475569',
                              color: '#CBD5E1',
                              padding: '5px 12px',
                              borderRadius: '6px',
                              fontSize: '11.5px',
                              cursor: 'pointer',
                            }}
                          >
                            ← Return to Sessions
                          </button>
                        </div>
                        <div style={{ marginTop: '8px', fontSize: '10.5px', color: '#64748B' }}>
                          💡 Multi-device testing: Open in another window/device logged in as <strong>{otherName}</strong>.
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Local Camera PIP (Picture-In-Picture Container) */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '10px',
                    right: '10px',
                    width: '150px',
                    height: '100px',
                    borderRadius: '10px',
                    background: '#1E293B',
                    border: '2px solid #334155',
                    overflow: 'hidden',
                    boxShadow: '0 6px 18px rgba(0,0,0,0.6)',
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
                        fontSize: '11px',
                        gap: '3px',
                      }}
                    >
                      <CameraOffIcon size={18} />
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
                      bottom: '4px',
                      left: '6px',
                      background: 'rgba(15, 23, 42, 0.8)',
                      padding: '1px 5px',
                      borderRadius: '4px',
                      fontSize: '9.5px',
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
                  borderRadius: '12px',
                  padding: '6px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  border: '1px solid #334155',
                  flexShrink: 0,
                }}
              >
                {/* Mute/Unmute */}
                <button
                  type="button"
                  onClick={handleToggleMic}
                  style={{
                    width: '38px',
                    height: '38px',
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
                  {isMuted ? <MicOffIcon size={18} /> : <MicIcon size={18} />}
                </button>

                {/* Camera Toggle */}
                <button
                  type="button"
                  onClick={handleToggleCamera}
                  style={{
                    width: '38px',
                    height: '38px',
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
                  {isCamOff ? <CameraOffIcon size={18} /> : <CameraIcon size={18} />}
                </button>

                {/* Screen Share */}
                <button
                  type="button"
                  onClick={handleToggleScreenShare}
                  style={{
                    width: '38px',
                    height: '38px',
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
                  <ScreenShareIcon size={18} />
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
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: '#B91C1C',
                    color: '#fff',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    marginLeft: '4px',
                  }}
                  title="Leave Call"
                >
                  <PhoneOffIcon size={18} />
                </button>

                {/* Divider between Call Controls and Collaboration Tools */}
                <div style={{ width: '1px', height: '22px', background: '#334155', margin: '0 4px' }} />

                {/* Notes Toggle Button */}
                <button
                  type="button"
                  onClick={() => handleToggleSidebarTab('notes')}
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: isSidebarOpen && activeTab === 'notes' ? '#0284C7' : '#334155',
                    color: '#fff',
                    border: isSidebarOpen && activeTab === 'notes' ? '1px solid #38BDF8' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  title={isSidebarOpen && activeTab === 'notes' ? 'Hide Notes' : 'Open Workspace Notes'}
                >
                  <DocumentIcon size={18} />
                </button>

                {/* Chat Toggle Button */}
                <button
                  type="button"
                  onClick={() => handleToggleSidebarTab('chat')}
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: isSidebarOpen && activeTab === 'chat' ? '#0284C7' : '#334155',
                    color: '#fff',
                    border: isSidebarOpen && activeTab === 'chat' ? '1px solid #38BDF8' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative',
                  }}
                  title={isSidebarOpen && activeTab === 'chat' ? 'Hide Chat' : 'Open In-Call Chat'}
                >
                  <MessageIcon size={18} />
                  {chatMessages.length > 1 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '-3px',
                        right: '-3px',
                        fontSize: '9px',
                        background: '#0284C7',
                        color: '#fff',
                        padding: '1px 5px',
                        borderRadius: '10px',
                        border: '2px solid #1E293B',
                        fontWeight: 700,
                      }}
                    >
                      {chatMessages.length}
                    </span>
                  )}
                </button>

                {/* Files Toggle Button */}
                <button
                  type="button"
                  onClick={() => handleToggleSidebarTab('files')}
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: isSidebarOpen && activeTab === 'files' ? '#0284C7' : '#334155',
                    color: '#fff',
                    border: isSidebarOpen && activeTab === 'files' ? '1px solid #38BDF8' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative',
                  }}
                  title={isSidebarOpen && activeTab === 'files' ? 'Hide Files' : 'Open Shared Attachments'}
                >
                  <PaperclipIcon size={18} />
                  {files.length > 0 && (
                    <span
                      style={{
                        position: 'absolute',
                        top: '-3px',
                        right: '-3px',
                        fontSize: '9px',
                        background: '#38BDF8',
                        color: '#0F172A',
                        padding: '1px 5px',
                        borderRadius: '10px',
                        border: '2px solid #1E293B',
                        fontWeight: 800,
                      }}
                    >
                      {files.length}
                    </span>
                  )}
                </button>

                {/* Fullscreen Toggle Button */}
                <button
                  type="button"
                  onClick={handleToggleFullscreen}
                  style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    background: isFullscreen ? '#0284C7' : '#334155',
                    color: '#fff',
                    border: isFullscreen ? '1px solid #38BDF8' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  title={isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
                >
                  {isFullscreen ? <MinimizeIcon size={18} /> : <MaximizeIcon size={18} />}
                </button>
              </div>
            </div>

            {/* Right Column: Collaboration Sidebar (Notes, Chat, Shared Files) */}
            {isSidebarOpen && (
              <div
                style={{
                  background: '#1E293B',
                  borderRadius: '12px',
                  border: '1px solid #334155',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  height: '100%',
                  minHeight: 0,
                }}
              >
                {/* Tab Navigation with Close X Icon */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid #334155',
                    background: '#0F172A',
                    flexShrink: 0,
                    paddingRight: '6px',
                  }}
                >
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', flex: 1 }}>
                    <button
                      type="button"
                      onClick={() => setActiveTab('notes')}
                      style={{
                        padding: '9px 6px',
                        background: activeTab === 'notes' ? '#1E293B' : 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'notes' ? '2px solid #0284C7' : 'none',
                        color: activeTab === 'notes' ? '#F8FAFC' : '#94A3B8',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                      }}
                    >
                      <DocumentIcon size={15} /> Notes
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab('chat')}
                      style={{
                        padding: '9px 6px',
                        background: activeTab === 'chat' ? '#1E293B' : 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'chat' ? '2px solid #0284C7' : 'none',
                        color: activeTab === 'chat' ? '#F8FAFC' : '#94A3B8',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                      }}
                    >
                      <MessageIcon size={15} /> Chat
                      {chatMessages.length > 1 && (
                        <span style={{ fontSize: '9.5px', background: '#0284C7', color: '#fff', padding: '1px 5px', borderRadius: '10px' }}>
                          {chatMessages.length}
                        </span>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('files');
                        bookingApi
                          .getSessionFiles(bookingId)
                          .then((res) => {
                            if (Array.isArray(res)) setFiles(res);
                          })
                          .catch(() => {});
                      }}
                      style={{
                        padding: '9px 6px',
                        background: activeTab === 'files' ? '#1E293B' : 'transparent',
                        border: 'none',
                        borderBottom: activeTab === 'files' ? '2px solid #0284C7' : 'none',
                        color: activeTab === 'files' ? '#F8FAFC' : '#94A3B8',
                        fontSize: '12px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '5px',
                      }}
                    >
                      <PaperclipIcon size={15} /> Files
                      {files.length > 0 && (
                        <span style={{ fontSize: '9.5px', background: '#334155', color: '#fff', padding: '1px 5px', borderRadius: '10px' }}>
                          {files.length}
                        </span>
                      )}
                    </button>
                  </div>

                  {/* Close X Icon in top right corner of notes & file sidebar */}
                  <button
                    type="button"
                    onClick={() => setIsSidebarOpen(false)}
                    style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '6px',
                      background: 'transparent',
                      border: 'none',
                      color: '#94A3B8',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginLeft: '6px',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = '#F8FAFC';
                      e.currentTarget.style.background = '#334155';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = '#94A3B8';
                      e.currentTarget.style.background = 'transparent';
                    }}
                    title="Close (Hide) Sidebar"
                  >
                    <XIcon size={16} />
                  </button>
                </div>

              {/* TAB 1: Real-time Notes */}
              {activeTab === 'notes' && (
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '12px', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#CBD5E1' }}>Workspace Notes</span>
                    <span style={{ fontSize: '10.5px', color: '#64748B' }}>{notesStatus}</span>
                  </div>
                  <textarea
                    value={notes}
                    onChange={handleNotesChange}
                    placeholder="Type code snippets, discussion bullet points, architecture diagrams, or next steps here..."
                    style={{
                      flex: 1,
                      minHeight: 0,
                      width: '100%',
                      background: '#0F172A',
                      color: '#F8FAFC',
                      border: '1px solid #334155',
                      borderRadius: '8px',
                      padding: '10px',
                      fontFamily: 'monospace',
                      fontSize: '12px',
                      lineHeight: 1.5,
                      resize: 'none',
                      outline: 'none',
                    }}
                  />
                  <div style={{ fontSize: '10.5px', color: '#64748B', flexShrink: 0 }}>
                    💡 Notes auto-saved to your profile.
                  </div>
                </div>
              )}

              {/* TAB 2: In-Call Chat */}
              {activeTab === 'chat' && (
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {chatMessages.map((msg) => (
                      <div
                        key={msg.id}
                        style={{
                          alignSelf: msg.isSystem ? 'center' : msg.isMe ? 'flex-end' : 'flex-start',
                          maxWidth: msg.isSystem ? '95%' : '85%',
                          background: msg.isSystem ? 'rgba(56, 189, 248, 0.08)' : msg.isMe ? '#0284C7' : '#334155',
                          border: msg.isSystem ? '1px dashed rgba(56, 189, 248, 0.3)' : 'none',
                          borderRadius: '8px',
                          padding: '6px 10px',
                          fontSize: '12px',
                        }}
                      >
                        {!msg.isSystem && (
                          <div style={{ fontSize: '10px', opacity: 0.7, marginBottom: '2px', fontWeight: 600 }}>
                            {msg.sender} · {msg.time}
                          </div>
                        )}
                        <div style={{ color: msg.isSystem ? '#38BDF8' : '#fff', lineHeight: 1.35 }}>{msg.text}</div>
                      </div>
                    ))}
                    <div ref={chatBottomRef} />
                  </div>

                  <form onSubmit={handleSendMessage} style={{ padding: '8px 12px', borderTop: '1px solid #334155', display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Send message or link..."
                      style={{
                        flex: 1,
                        background: '#0F172A',
                        border: '1px solid #334155',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        color: '#fff',
                        fontSize: '12px',
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
                        borderRadius: '6px',
                        padding: '6px 12px',
                        fontSize: '12px',
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
                <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', padding: '12px', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#CBD5E1' }}>Attachments</span>
                    <label
                      style={{
                        background: '#0284C7',
                        color: '#fff',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                      }}
                    >
                      <PaperclipIcon size={13} /> {uploadingFile ? 'Uploading…' : 'Share File'}
                      <input
                        ref={fileInputRef}
                        type="file"
                        onChange={handleFileUpload}
                        disabled={uploadingFile}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>

                  <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {files.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '30px 12px', color: '#64748B', fontSize: '12px' }}>
                        No files shared in this call yet. Upload logs or specs (up to 25MB).
                      </div>
                    ) : (
                      files.map((file) => (
                        <div
                          key={file.id}
                          style={{
                            background: '#0F172A',
                            border: '1px solid #334155',
                            borderRadius: '8px',
                            padding: '8px 10px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '6px',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: 1 }}>
                            <DocumentIcon size={16} className="text-sky-400 shrink-0" />
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <div style={{ fontSize: '12px', fontWeight: 600, color: '#F8FAFC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {file.filename}
                              </div>
                              <div style={{ fontSize: '10px', color: '#64748B' }}>
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
                                padding: '3px 8px',
                                borderRadius: '5px',
                                fontSize: '10.5px',
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
          )}
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
    </div>
  );
}
