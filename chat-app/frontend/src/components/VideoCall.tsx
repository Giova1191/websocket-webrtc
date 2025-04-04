
import { useState, useEffect, useRef, useCallback } from 'react';
import './VideoCall.css';


interface IceCandidate {
  candidate: RTCIceCandidateInit;
  from: number;
  to?: number;
}

interface CallData {
  from: number;
  to?: number;
  username?: string;
}

interface OfferData {
  offer: RTCSessionDescriptionInit;
  from: number;
  to?: number;
}

interface AnswerData {
  answer: RTCSessionDescriptionInit;
  from: number;
  to?: number;
}


interface SocketInterface {
  emit(event: 'video_call_ended', data: CallData): void;
  emit(event: 'video_ice_candidate', data: IceCandidate): void;
  emit(event: 'video_offer', data: OfferData): void;
  emit(event: 'video_answer', data: AnswerData): void;

  on(event: 'video_offer', callback: (data: OfferData) => void): void;
  on(event: 'video_answer', callback: (data: AnswerData) => void): void;
  on(event: 'video_ice_candidate', callback: (data: IceCandidate) => void): void;
  on(event: 'video_call_ended', callback: (data: CallData) => void): void;

  off(event: string): void;
}

interface VideoCallProps {
  socket: SocketInterface;
  currentUser: { id: number; username: string };
  peerUser: { id: number; username: string };
  onClose: () => void;
  isInitiator: boolean;
}

const VideoCall = ({ socket, currentUser, peerUser, onClose, isInitiator }: VideoCallProps) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStream = useRef<MediaStream | null>(null);

  const videoCallRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x: 20, y: 20 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const [connectionState, setConnectionState] = useState<string>('connecting');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Aggiungi stati per la condivisione schermo
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenStream = useRef<MediaStream | null>(null);

  const handleCallEnd = useCallback(() => {
    // Notifica l'altro utente
    socket.emit('video_call_ended', {
      to: peerUser.id,
      from: currentUser.id
    });

    // Chiudi la chiamata
    onClose();
  }, [socket, peerUser.id, currentUser.id, onClose]);

  const toggleMute = () => {
    if (localStream.current) {
      const audioTracks = localStream.current.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleCamera = () => {
    if (localStream.current) {
      const videoTracks = localStream.current.getVideoTracks();
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsCameraOff(!isCameraOff);
    }
  };

  const toggleSize = () => {
    setIsExpanded(!isExpanded);
  };

  // Aggiungi funzione per iniziare/fermare la condivisione schermo
  const toggleScreenSharing = async () => {
    try {
      if (isScreenSharing) {
        // Ferma la condivisione schermo
        if (screenStream.current) {
          screenStream.current.getTracks().forEach(track => track.stop());
        }

        // Ripristina il video dalla webcam
        if (localStream.current && peerConnection.current) {
          const videoTrack = localStream.current.getVideoTracks()[0];
          const sender = peerConnection.current.getSenders().find(s =>
            s.track?.kind === 'video'
          );

          if (sender && videoTrack) {
            sender.replaceTrack(videoTrack);
          }
        }

        setIsScreenSharing(false);
      } else {
        // Inizia la condivisione schermo
        const displayMediaOptions = {
          video: {
            cursor: "always" as const
          },
          audio: false
        } as DisplayMediaStreamOptions;

        const stream = await navigator.mediaDevices.getDisplayMedia(displayMediaOptions);
        screenStream.current = stream;

        // Sostituisci il video track nel peer connection
        if (peerConnection.current) {
          const videoTrack = stream.getVideoTracks()[0];
          const sender = peerConnection.current.getSenders().find(s =>
            s.track?.kind === 'video'
          );

          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        }

        
        stream.getVideoTracks()[0].addEventListener('ended', () => {
          toggleScreenSharing();
        });

        setIsScreenSharing(true);
      }
    } catch (err) {
      console.error("Error toggling screen share:", err);
    }
  };

  useEffect(() => {
    const header = headerRef.current;
    const videoCall = videoCallRef.current;

    if (!header || !videoCall) return;

    const handleMouseDown = (e: MouseEvent) => {
      setIsDragging(true);
      const rect = videoCall.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const x = e.clientX - dragOffset.x;
      const y = e.clientY - dragOffset.y;

      // Limita il movimento all'interno della finestra
      const maxX = window.innerWidth - videoCall.offsetWidth;
      const maxY = window.innerHeight - videoCall.offsetHeight;

      setPosition({
        x: Math.max(0, Math.min(x, maxX)),
        y: Math.max(0, Math.min(y, maxY))
      });

      videoCall.style.right = 'auto';
      videoCall.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
      videoCall.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    header.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      header.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  useEffect(() => {
    // Configurazione WebRTC
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    const startCall = async () => {
      try {
        
        const constraints = {
          video: {
            width: { ideal: 640 },  
            height: { ideal: 480 }, 
            frameRate: { max: 15 }  
          },
          audio: true
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);

        localStream.current = stream;

        // Mostra il video locale
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Crea la connessione peer
        peerConnection.current = new RTCPeerConnection(configuration);

        
        stream.getTracks().forEach(track => {
          if (peerConnection.current) {
            peerConnection.current.addTrack(track, stream);
          }
        });

        
        peerConnection.current.ontrack = event => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        
        peerConnection.current.onicecandidate = event => {
          if (event.candidate) {
            socket.emit('video_ice_candidate', {
              candidate: event.candidate,
              to: peerUser.id,
              from: currentUser.id
            });
          }
        };

        
        peerConnection.current.oniceconnectionstatechange = () => {
          if (peerConnection.current) {
            setConnectionState(peerConnection.current.iceConnectionState);

            if (peerConnection.current.iceConnectionState === 'disconnected' ||
                peerConnection.current.iceConnectionState === 'failed' ||
                peerConnection.current.iceConnectionState === 'closed') {
              handleCallEnd();
            }
          }
        };

        
        if (isInitiator) {
          const offer = await peerConnection.current.createOffer();
          await peerConnection.current.setLocalDescription(offer);

          socket.emit('video_offer', {
            offer: offer,
            to: peerUser.id,
            from: currentUser.id
          });
        }

        
        socket.on('video_offer', async (data) => {
          if (data.from === peerUser.id && peerConnection.current) {
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.offer));

            const answer = await peerConnection.current.createAnswer();
            await peerConnection.current.setLocalDescription(answer);

            socket.emit('video_answer', {
              answer: answer,
              to: peerUser.id,
              from: currentUser.id
            });
          }
        });

        socket.on('video_answer', async (data) => {
          if (data.from === peerUser.id && peerConnection.current) {
            await peerConnection.current.setRemoteDescription(new RTCSessionDescription(data.answer));
          }
        });

        socket.on('video_ice_candidate', async (data) => {
          if (data.from === peerUser.id && peerConnection.current) {
            await peerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
          }
        });

        socket.on('video_call_ended', (data) => {
          if (data.from === peerUser.id) {
            handleCallEnd();
          }
        });

      } catch (err) {
        console.error('Errore nell\'avvio della chiamata:', err);
        alert('Impossibile accedere alla fotocamera o al microfono. Verifica i permessi.');
        handleCallEnd();
      }
    };

    startCall();

    
    return () => {
      
      socket.off('video_offer');
      socket.off('video_answer');
      socket.off('video_ice_candidate');
      socket.off('video_call_ended');

      // Chiudi la connessione
      if (peerConnection.current) {
        peerConnection.current.close();
      }

      // Ferma il flusso video locale
      if (localStream.current) {
        localStream.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [socket, currentUser, peerUser, isInitiator, handleCallEnd]);

  useEffect(() => {
    let animationFrameId: number;
    let lastTime = 0;
    const FPS_CAP = 15; 
    const interval = 1000 / FPS_CAP;
    
    const optimizedRender = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(optimizedRender);
      
      
      if (currentTime - lastTime < interval) return;
      lastTime = currentTime;
      
      
    };
    
   
    animationFrameId = requestAnimationFrame(optimizedRender);
    
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  return (
    <div 
      className={`video-call-container ${isExpanded ? 'expanded' : ''}`} 
      ref={videoCallRef}
      style={{ 
        left: isExpanded ? '0' : `${position.x}px`, 
        top: isExpanded ? '0' : `${position.y}px`,
        right: isExpanded ? '0' : 'auto',
        bottom: isExpanded ? '0' : 'auto'
      }}
    >
      <div className="video-call-header" ref={headerRef}>
        <h3>Chiamata con {peerUser.username}</h3>
        <div className="header-controls">
          <div className="connection-status">
            {connectionState === 'connected' ? 'Connesso' : 'Connessione in corso...'}
          </div>
          <button 
            className="expand-button" 
            onClick={toggleSize} 
            title={isExpanded ? "Rimpicciolisci" : "Ingrandisci"}
          >
            {isExpanded ? '⊙' : '⊕'}
          </button>
          <button 
            className="close-button" 
            onClick={handleCallEnd} 
            title="Chiudi chiamata"
          >
            ✖
          </button>
        </div>
      </div>

      <div className="video-streams">
        <div className="remote-video-container">
          <video
            ref={remoteVideoRef}
            className="remote-video"
            autoPlay
            playsInline
          />
          {connectionState !== 'connected' && (
            <div className="connecting-overlay">
              <div className="spinner"></div>
              <p>Connessione in corso...</p>
            </div>
          )}
        </div>

        <video
          ref={localVideoRef}
          className="local-video"
          autoPlay
          playsInline
          muted
        />
      </div>

      <div className="video-controls">
        <button 
          className={`control-button ${isMuted ? 'active' : ''}`}
          onClick={toggleMute}
          title={isMuted ? "Attiva audio" : "Disattiva audio"}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
        
        <button 
          className={`control-button ${isCameraOff ? 'active' : ''}`}
          onClick={toggleCamera}
          title={isCameraOff ? "Attiva camera" : "Disattiva camera"}
        >
          {isCameraOff ? '📷❌' : '📷'}
        </button>
        
        <button 
          className={`control-button ${isScreenSharing ? 'active' : ''}`}
          onClick={toggleScreenSharing}
          title={isScreenSharing ? "Ferma condivisione" : "Condividi schermo"}
        >
          {isScreenSharing ? '📺❌' : '📺'}
        </button>
        
        <button 
          className="control-button end-call"
          onClick={handleCallEnd}
          title="Termina chiamata"
        >
          📵
        </button>
      </div>
    </div>
  );
};

export default VideoCall;