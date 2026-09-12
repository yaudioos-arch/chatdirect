import React, { useRef, useState } from 'react';
import { Image as ImageIcon, Loader2, Plus, UploadCloud, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiUrl } from '../lib/api';

export default function StoryModal({ onClose }) {
  const { currentUser } = useAuth();
  const [content, setContent] = useState('');
  const [media, setMedia] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef(null);

  const selectFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      setError('Choose an image or video file');
      return;
    }
    setMedia(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleFile = (event) => selectFile(event.target.files?.[0]);

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    selectFile(event.dataTransfer.files?.[0]);
  };

  const publish = async () => {
    if (!content.trim() && !media) {
      setError('Add text or media to publish a story');
      return;
    }
    setLoading(true);
    setError('');
    try {
      let mediaUrl = null;
      let mediaType = null;
      if (media) {
        const formData = new FormData();
        formData.append('file', media);
        const uploadRes = await fetch(apiUrl('/api/upload'), { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        if (!uploadRes.ok || !uploadData.fileUrl) throw new Error(uploadData.error || 'Media upload failed');
        mediaUrl = uploadData.fileUrl;
        mediaType = media.type;
      }
      const res = await fetch(apiUrl('/api/stories'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: currentUser.id, content, mediaUrl, mediaType })
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to publish story');
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="story-create-overlay fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="story-create-dialog w-full max-w-md overflow-hidden rounded-2xl shadow-2xl animate-fadeIn">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-base font-bold text-[#e9edef]">Create new story</h2>
          <button onClick={onClose} className="rounded-full p-1.5 text-[#8696a0] hover:bg-white/10 hover:text-white" aria-label="Close">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div
          onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`relative min-h-80 flex flex-col items-center justify-center overflow-hidden border-b border-white/10 bg-[#202125] p-6 ${isDragging ? 'story-create-drop-active' : ''}`}
        >
          {!previewUrl && (
            <>
              <div className="story-upload-animation mb-5">
                <UploadCloud className="h-16 w-16 text-white/90" strokeWidth={1.25} />
                <span className="story-upload-orbit story-upload-orbit-one" />
                <span className="story-upload-orbit story-upload-orbit-two" />
              </div>
              <p className="mb-5 text-xl font-normal text-white">Drag photos and videos here</p>
              <button type="button" onClick={() => fileRef.current?.click()} className="rounded-lg bg-[#5856f5] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#6866ff]">
                Select from computer
              </button>
              <p className="mt-4 text-[11px] text-white/45">Or share a thought below</p>
            </>
          )}
          {previewUrl && (media?.type.startsWith('video/') ? (
            <video src={previewUrl} controls className="max-h-64 max-w-full rounded-lg object-contain" />
          ) : (
            <img src={previewUrl} alt="Story preview" className="max-h-64 max-w-full rounded-lg object-contain" />
          ))}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Share a thought..."
            className={`${previewUrl ? 'absolute inset-x-4 bottom-4' : 'mt-5'} min-h-14 w-full resize-none rounded-xl border border-white/20 bg-black/45 p-3 text-sm text-white placeholder-white/60 focus:outline-none focus:border-[#5856f5]`}
            maxLength={500}
          />
        </div>
        {error && <p className="mt-3 text-xs text-rose-400">{error}</p>}
        <div className="flex items-center justify-between gap-3 bg-[#202125] px-5 py-4">
          <input ref={fileRef} type="file" accept="image/*,video/*" onChange={handleFile} className="hidden" />
          {previewUrl ? (
            <button type="button" onClick={() => fileRef.current?.click()} className="flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs text-white hover:bg-white/10">
              <ImageIcon className="w-4 h-4" /> Change media
            </button>
          ) : <span className="text-[11px] text-white/40">Stories disappear after 24 hours</span>}
          <button type="button" onClick={publish} disabled={loading || (!media && !content.trim())} className="flex items-center gap-2 rounded-lg bg-[#5856f5] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#6866ff] disabled:opacity-50">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Share
          </button>
        </div>
      </div>
    </div>
  );
}
