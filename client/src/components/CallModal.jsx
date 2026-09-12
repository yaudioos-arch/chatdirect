import React, { useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  Maximize2,
  Minimize2
} from 'lucide-react';

export default function CallModal() {
  const {
    callState, // 'idle' | 'calling' | 'incoming' | 'connected'
    callPartner,
    isVideoCall,
    isPipMode,
    setIsPipMode,
    localStream,
    remoteStream,
    isMicMuted,
    isCamOff,
    callDuration,
    toggleMic,
    toggleCam,
    toggleScreenShare,
    isScreenSharing,
    acceptCall,
    rejectCall,
    endCall
  } = useSocket();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  if (callState === 'idle') return null;

  const formatDuration = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`;
  };

  // 1. INCOMING CALL SCREEN
  if (callState === 'incoming') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn select-none">
        <div className="w-full max-w-sm bg-[#111b21] border border-[#222d34] rounded-3xl p-6 text-center shadow-2xl">
          <div className="relative inline-block mb-4">
            <img
              src={callPartner?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${callPartner?.username}`}
              alt=""
              className="w-24 h-24 rounded-full mx-auto bg-[#202c33] border-4 border-[#00a884] p-1 animate-pulse"
            />
            <span className="absolute bottom-1 right-1 p-2 bg-[#00a884] text-[#111b21] rounded-full shadow-lg">
              {isVideoCall ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
            </span>
          </div>

          <h3 className="text-xl font-bold text-[#e9edef]">{callPartner?.display_name || 'Incoming Call'}</h3>
          <p className="text-xs text-[#00a884] font-medium mt-1 animate-pulse">
            Incoming {isVideoCall ? 'Video' : 'Audio'} Call...
          </p>

          <div className="flex justify-center gap-8 mt-8">
            <button
              onClick={rejectCall}
              className="w-14 h-14 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition"
              title="Decline Call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
            <button
              onClick={acceptCall}
              className="w-14 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition animate-bounce"
              title="Accept Call"
            >
              <Phone className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 2. OUTGOING CALLING SCREEN
  if (callState === 'calling') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn select-none">
        <div className="w-full max-w-sm bg-[#111b21] border border-[#222d34] rounded-3xl p-6 text-center shadow-2xl">
          <div className="relative inline-block mb-4">
            <img
              src={callPartner?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${callPartner?.username}`}
              alt=""
              className="w-24 h-24 rounded-full mx-auto bg-[#202c33] border-4 border-[#00a884]/60 p-1 animate-pulse"
            />
          </div>

          <h3 className="text-xl font-bold text-[#e9edef]">{callPartner?.display_name}</h3>
          <p className="text-xs text-[#8696a0] mt-1 animate-pulse">Calling {isVideoCall ? 'Video' : 'Audio'}...</p>

          <div className="flex justify-center gap-6 mt-8">
            <button
              onClick={endCall}
              className="w-14 h-14 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition"
              title="End Call"
            >
              <PhoneOff className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 3. PIP MODE FLOATING WIDGET
  if (isPipMode) {
    return (
      <div className="fixed bottom-6 right-6 w-64 bg-[#111b21] border border-[#2a3942] rounded-2xl shadow-2xl p-3 z-50 animate-fadeIn select-none flex flex-col gap-2 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <img src={callPartner?.avatar} alt="" className="w-7 h-7 rounded-full bg-[#202c33]" />
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{callPartner?.display_name}</p>
              <span className="text-[10px] text-emerald-400 font-mono">{formatDuration(callDuration)}</span>
            </div>
          </div>
          <button
            onClick={() => setIsPipMode(false)}
            className="p-1 hover:bg-[#202c33] text-[#8696a0] hover:text-white rounded-lg transition"
            title="Maximize"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {isVideoCall && remoteStream && (
          <div className="aspect-video w-full rounded-xl overflow-hidden bg-black">
            <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
          </div>
        )}

        <div className="flex justify-center gap-3 pt-1 border-t border-[#222d34]">
          <button onClick={toggleMic} className="p-2 rounded-full bg-white/10 text-white hover:bg-white/20 text-xs">
            {isMicMuted ? <MicOff className="w-3.5 h-3.5 text-rose-400" /> : <Mic className="w-3.5 h-3.5" />}
          </button>
          <button onClick={endCall} className="p-2 rounded-full bg-rose-600 text-white hover:bg-rose-700 text-xs">
            <PhoneOff className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // 4. CONNECTED CALL (FULL SCREEN)
  return (
    <div className="fixed inset-0 z-50 bg-[#0b141a] flex flex-col justify-between select-none animate-fadeIn">
      {/* Top Bar */}
      <div className="h-16 px-6 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <img
            src={callPartner?.avatar}
            alt=""
            className="w-10 h-10 rounded-full bg-[#202c33] border border-white/20 object-cover"
          />
          <div>
            <h3 className="text-sm font-bold text-white">{callPartner?.display_name}</h3>
            <span className="text-xs text-emerald-400 font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              {formatDuration(callDuration)}
            </span>
          </div>
        </div>

        {/* Minimize to PiP button */}
        <button
          onClick={() => setIsPipMode(true)}
          className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition flex items-center gap-1.5 text-xs font-semibold"
          title="Picture-in-Picture (Chat while calling)"
        >
          <Minimize2 className="w-4 h-4" />
          <span>Minimize</span>
        </button>
      </div>

      {/* Main View Area */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-[#0c1317]">
        {isVideoCall && remoteStream ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-contain max-h-[85vh]"
          />
        ) : (
          <div className="text-center">
            <div className="relative inline-block">
              <img
                src={callPartner?.avatar}
                alt=""
                className="w-32 h-32 rounded-full mx-auto bg-[#202c33] border-4 border-[#00a884] p-1 shadow-2xl"
              />
              <div className="absolute -inset-4 rounded-full border-2 border-[#00a884]/30 animate-ping pointer-events-none" />
            </div>
            <h4 className="text-lg font-bold text-white mt-4">{callPartner?.display_name}</h4>
            <p className="text-xs text-[#8696a0] mt-1">1-on-1 Encrypted Call</p>
          </div>
        )}

        {/* Local Video Preview */}
        {isVideoCall && (
          <div className="absolute bottom-6 right-6 w-36 sm:w-48 aspect-video bg-[#111b21] rounded-2xl overflow-hidden border-2 border-[#00a884] shadow-2xl z-20">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover ${isCamOff ? 'hidden' : ''}`}
            />
            {isCamOff && (
              <div className="w-full h-full flex items-center justify-center bg-[#202c33] text-xs text-[#8696a0]">
                Camera Off
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Control Bar */}
      <div className="h-24 px-6 bg-gradient-to-t from-black/90 to-transparent flex items-center justify-center gap-4 sm:gap-6 z-20">
        <button
          onClick={toggleMic}
          className={`w-12 h-12 rounded-full flex items-center justify-center transition ${
            isMicMuted ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50' : 'bg-white/10 hover:bg-white/20 text-white'
          }`}
          title={isMicMuted ? 'Unmute' : 'Mute'}
        >
          {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
        </button>

        {isVideoCall && (
          <button
            onClick={toggleCam}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition ${
              isCamOff ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title={isCamOff ? 'Turn Cam On' : 'Turn Cam Off'}
          >
            {isCamOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>
        )}

        {isVideoCall && (
          <button
            onClick={toggleScreenShare}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition ${
              isScreenSharing ? 'bg-[#00a884] text-[#111b21]' : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
            title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
          >
            <Monitor className="w-5 h-5" />
          </button>
        )}

        <button
          onClick={endCall}
          className="w-14 h-14 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex items-center justify-center shadow-lg hover:scale-105 transition"
          title="End Call"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}
