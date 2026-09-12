import React from 'react';
import { useSocket } from '../context/SocketContext';
import { X, Download, ExternalLink } from 'lucide-react';

export default function MediaLightbox() {
  const { lightboxMedia, setLightboxMedia } = useSocket();

  if (!lightboxMedia) return null;

  const isVideo = /\.(mp4|webm|mov|m4v|mkv|ogg)$/i.test(lightboxMedia);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between p-4 animate-fadeIn select-none"
      onClick={() => setLightboxMedia(null)}
    >
      {/* Top Bar */}
      <div
        className="w-full flex items-center justify-between text-white/80 p-2 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-xs font-mono">{isVideo ? 'Video Player' : 'Photo View'}</span>
        <div className="flex items-center gap-3">
          <a
            href={lightboxMedia}
            download={isVideo ? 'video.mp4' : 'photo'}
            target="_blank"
            rel="noreferrer"
            className="p-2 hover:bg-white/10 rounded-full text-white transition"
            title="Download media"
          >
            <Download className="w-5 h-5" />
          </a>
          <button
            onClick={() => setLightboxMedia(null)}
            className="p-2 hover:bg-white/10 rounded-full text-white transition"
            title="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Main Media Preview */}
      <div
        className="flex-1 flex items-center justify-center p-2 max-w-5xl max-h-[85vh] w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {isVideo ? (
          <video
            src={lightboxMedia}
            controls
            autoPlay
            playsInline
            className="max-w-full max-h-[80vh] rounded-lg shadow-2xl bg-black"
          />
        ) : (
          <img
            src={lightboxMedia}
            alt="Full Preview"
            className="max-w-full max-h-[80vh] object-contain rounded-lg shadow-2xl"
          />
        )}
      </div>

      {/* Bottom spacer */}
      <div className="h-6" />
    </div>
  );
}
