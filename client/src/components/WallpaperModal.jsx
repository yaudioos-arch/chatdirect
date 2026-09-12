import React, { useState, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import { apiUrl } from '../lib/api';
import { X, Image as ImageIcon, Upload, Check, RotateCcw, Link } from 'lucide-react';

const WALLPAPER_PRESETS = [
  {
    name: 'Default Pattern',
    value: '',
    preview: 'bg-[#0b141a]'
  },
  {
    name: 'Charcoal Solid',
    value: 'linear-gradient(180deg, #111b21 0%, #152026 100%)',
    preview: 'bg-[#111b21]'
  },
  {
    name: 'Deep Navy',
    value: 'linear-gradient(180deg, #07121c 0%, #0c2033 100%)',
    preview: 'bg-[#0c2033]'
  },
  {
    name: 'Forest Emerald',
    value: 'linear-gradient(180deg, #051a14 0%, #0c2e25 100%)',
    preview: 'bg-[#0c2e25]'
  },
  {
    name: 'Midnight Plum',
    value: 'linear-gradient(180deg, #140a1f 0%, #251238 100%)',
    preview: 'bg-[#251238]'
  },
  {
    name: 'Dark Starfield',
    value: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?q=80&w=1200&auto=format&fit=crop',
    preview: 'bg-cover bg-center'
  },
  {
    name: 'Abstract Dark Wave',
    value: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=1200&auto=format&fit=crop',
    preview: 'bg-cover bg-center'
  }
];

export default function WallpaperModal({ contact, onClose }) {
  const { chatSettings, setChatWallpaper } = useSocket();
  const [selectedWallpaper, setSelectedWallpaper] = useState(contact?.wallpaper || chatSettings?.wallpaper || '');
  const [customUrl, setCustomUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(apiUrl('/api/upload'), { method: 'POST', body: formData });
      const data = await res.json();
      if (data.fileUrl) {
        setSelectedWallpaper(data.fileUrl);
      }
    } catch (err) {
      console.error('Wallpaper upload error:', err);
      alert('Failed to upload wallpaper');
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleApply = async () => {
    if (!contact) return;
    await setChatWallpaper(contact.id, selectedWallpaper);
    onClose();
  };

  const handleReset = async () => {
    if (!contact) return;
    setSelectedWallpaper('');
    await setChatWallpaper(contact.id, '');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b141a]/80 backdrop-blur-sm p-4 select-none animate-fadeIn">
      <div className="w-full max-w-md bg-[#111b21] border border-[#222d34] rounded-2xl shadow-2xl p-5 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#222d34]">
          <div className="flex items-center gap-2 text-[#e9edef]">
            <div className="w-8 h-8 rounded-lg bg-[#00a884]/20 flex items-center justify-center text-[#00a884]">
              <ImageIcon className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#e9edef]">Chat Wallpaper</h3>
              <p className="text-[11px] text-[#8696a0]">Custom background for {contact?.display_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8696a0] hover:text-[#e9edef] hover:bg-[#202c33] rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {/* Wallpaper Preview Area */}
          <div className="relative h-28 rounded-xl overflow-hidden border border-[#222d34] flex items-center justify-center shadow-inner">
            <div
              className="absolute inset-0 bg-cover bg-center chat-bg-pattern"
              style={
                selectedWallpaper.startsWith('http') || selectedWallpaper.startsWith('/uploads')
                  ? { backgroundImage: `url(${selectedWallpaper})` }
                  : selectedWallpaper.startsWith('linear-gradient')
                  ? { background: selectedWallpaper }
                  : {}
              }
            />
            <div className="relative z-10 bg-[#202c33]/80 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-[#e9edef] border border-white/10 font-medium">
              Live Preview
            </div>
          </div>

          {/* Presets Grid */}
          <div>
            <span className="text-[11px] font-semibold text-[#8696a0] uppercase tracking-wider block mb-2">
              Color & Theme Presets
            </span>
            <div className="grid grid-cols-3 gap-2">
              {WALLPAPER_PRESETS.map((p, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedWallpaper(p.value)}
                  className={`h-16 rounded-xl border-2 transition overflow-hidden relative flex flex-col items-center justify-end p-1.5 ${
                    selectedWallpaper === p.value
                      ? 'border-[#00a884] ring-1 ring-[#00a884]'
                      : 'border-[#222d34] hover:border-[#2a3942]'
                  }`}
                  style={
                    p.value.startsWith('http')
                      ? { backgroundImage: `url(${p.value})`, backgroundSize: 'cover' }
                      : p.value.startsWith('linear-gradient')
                      ? { background: p.value }
                      : { backgroundColor: '#111b21' }
                  }
                >
                  <span className="bg-black/70 text-[10px] text-white px-1.5 py-0.5 rounded font-medium truncate max-w-full">
                    {p.name}
                  </span>
                  {selectedWallpaper === p.value && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#00a884] text-[#111b21] flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Upload Button */}
          <div>
            <span className="text-[11px] font-semibold text-[#8696a0] uppercase tracking-wider block mb-2">
              Upload Custom Image
            </span>
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              disabled={isUploading}
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-2.5 px-3 bg-[#202c33] hover:bg-[#2a3942] border border-[#222d34] rounded-xl text-xs text-[#e9edef] font-semibold flex items-center justify-center gap-2 transition"
            >
              {isUploading ? (
                <div className="w-4 h-4 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
              ) : (
                <Upload className="w-4 h-4 text-[#00a884]" />
              )}
              <span>{isUploading ? 'Uploading Image...' : 'Choose Image from Computer'}</span>
            </button>
          </div>

          {/* Or Image URL */}
          <div>
            <span className="text-[11px] font-semibold text-[#8696a0] uppercase tracking-wider block mb-1.5">
              Or Image URL
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="https://example.com/wallpaper.jpg"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="flex-1 bg-[#202c33] text-[#e9edef] text-xs px-3 py-2 rounded-xl border border-[#222d34] focus:outline-none focus:border-[#00a884]"
              />
              <button
                type="button"
                onClick={() => {
                  if (customUrl.trim()) setSelectedWallpaper(customUrl.trim());
                }}
                className="px-3 py-2 bg-[#202c33] hover:bg-[#2a3942] text-xs font-semibold text-[#00a884] rounded-xl transition border border-[#222d34]"
              >
                Set
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="pt-3 mt-3 border-t border-[#222d34] flex items-center justify-between">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-[#8696a0] hover:text-[#e9edef] transition py-1.5 px-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Default</span>
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 bg-[#202c33] hover:bg-[#2a3942] text-xs font-semibold text-[#e9edef] rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="px-4 py-2 bg-[#00a884] hover:bg-[#008f6f] text-xs font-bold text-[#111b21] rounded-xl transition shadow"
            >
              Apply Wallpaper
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
