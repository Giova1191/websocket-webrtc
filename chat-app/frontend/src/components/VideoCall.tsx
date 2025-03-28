// src/components/VideoCall.tsx
import { useState, useEffect, useRef, useCallback } from 'react';
import './VideoCall.css';

// Definiamo interfacce più specifiche per i dati
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

// Miglioriamo l'interfaccia del socket con tipi specifici
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

  const [connectionState, setConnectionState] = useState<string>('connecting');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isCameraOff, setIsCameraOff] = useState<boolean>(false);

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
        // Ottieni accesso a fotocamera e microfono
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true
        });

        localStream.current = stream;

        // Mostra il video locale
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Crea la connessione peer
        peerConnection.current = new RTCPeerConnection(configuration);

        // Aggiungi le tracce alla connessione peer
        stream.getTracks().forEach(track => {
          if (peerConnection.current) {
            peerConnection.current.addTrack(track, stream);
          }
        });

        // Gestisci il flusso remoto in arrivo
        peerConnection.current.ontrack = event => {
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = event.streams[0];
          }
        };

        // Gestisci i candidati ICE
        peerConnection.current.onicecandidate = event => {
          if (event.candidate) {
            socket.emit('video_ice_candidate', {
              candidate: event.candidate,
              to: peerUser.id,
              from: currentUser.id
            });
          }
        };

        // Gestisci i cambiamenti di stato della connessione
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

        // Se sei l'iniziatore, crea l'offerta
        if (isInitiator) {
          const offer = await peerConnection.current.createOffer();
          await peerConnection.current.setLocalDescription(offer);

          socket.emit('video_offer', {
            offer: offer,
            to: peerUser.id,
            from: currentUser.id
          });
        }

        // Listener per eventi socket
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

    // Cleanup
    return () => {
      // Rimuovi i listener
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

  return (
    <div className="video-call-container">
      <div className="video-call-header">
        <h3>Chiamata con {peerUser.username}</h3>
        <div className="connection-status">
          {connectionState === 'connected' ? 'Connesso' : 'Connessione in corso...'}
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
        >
          {isMuted ? '🔇' : '🔊'}
        </button>

        <button
          className={`control-button ${isCameraOff ? 'active' : ''}`}
          onClick={toggleCamera}
        >
          {isCameraOff ? '📷❌' : '📷'}
        </button>

        <button
          className="control-button end-call"
          onClick={handleCallEnd}
        >
          📵
        </button>
      </div>
    </div>
  );
};

export default VideoCall;