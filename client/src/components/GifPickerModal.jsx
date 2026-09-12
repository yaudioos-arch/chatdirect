import React, { useState, useEffect } from 'react';
import { Search, X, Sparkles, Smile, Flame, Heart, Laugh } from 'lucide-react';

const STICKER_PACKS = [
  { id: '1', name: 'Cat Vibe', url: 'https://media.giphy.com/media/jpbnoe3UIa8TU8LM13/giphy.gif' },
  { id: '2', name: 'Thumbs Up', url: 'https://media.giphy.com/media/111ebonMs90YLu/giphy.gif' },
  { id: '3', name: 'Dance Party', url: 'https://media.giphy.com/media/blSTtZehjAZ8I/giphy.gif' },
  { id: '4', name: 'Popcorn Chill', url: 'https://media.giphy.com/media/gl0mkIZOW6Nwc/giphy.gif' },
  { id: '5', name: 'Mind Blown', url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif' },
  { id: '6', name: 'Heart Eyes', url: 'https://media.giphy.com/media/uw0KpagtwEJtC/giphy.gif' },
  { id: '7', name: 'Coding Pro', url: 'https://media.giphy.com/media/unQ3IJU2RG7DO/giphy.gif' },
  { id: '8', name: 'Celebration', url: 'https://media.giphy.com/media/artj92V8o75VPL7AeQ/giphy.gif' },
  { id: '9', name: 'Laugh Out Loud', url: 'https://media.giphy.com/media/10JhviFuU2gWD6/giphy.gif' },
  { id: '10', name: 'Super Doge', url: 'https://media.giphy.com/media/oBQZIgNobc7ew/giphy.gif' },
  { id: '11', name: 'Cute Panda', url: 'https://media.giphy.com/media/5Zesu5VPNGJlm/giphy.gif' },
  { id: '12', name: 'Peace Out', url: 'https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif' }
];

const POPULAR_SEARCHES = ['Trending', 'Reaction', 'Happy', 'Dance', 'Sad', 'Love', 'Anime', 'Meme'];

export default function GifPickerModal({ isOpen, onClose, onSelectGif }) {
  const [activeTab, setActiveTab] = useState('stickers'); // 'stickers' | 'gifs'
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState(STICKER_PACKS);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    if (activeTab === 'stickers') {
      if (!query.trim()) {
        setGifs(STICKER_PACKS);
      } else {
        setGifs(STICKER_PACKS.filter((s) => s.name.toLowerCase().includes(query.toLowerCase())));
      }
    } else {
      searchTenorGifs(query || 'trending');
    }
  }, [query, activeTab, isOpen]);

  const searchTenorGifs = async (searchTerm) => {
    setIsLoading(true);
    try {
      // Free public Giphy/Tenor trending endpoints
      const res = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=dc6zaTOxFJmzC&q=${encodeURIComponent(
          searchTerm
        )}&limit=18&rating=g`
      );
      const data = await res.json();
      if (data.data && data.data.length > 0) {
        const formatted = data.data.map((item) => ({
          id: item.id,
          name: item.title,
          url: item.images.fixed_height.url || item.images.original.url
        }));
        setGifs(formatted);
      } else {
        setGifs(STICKER_PACKS);
      }
    } catch (err) {
      console.warn('GIF search fallback to stickers:', err);
      setGifs(STICKER_PACKS);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 select-none animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-[#111b21] border border-[#222d34] rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3 bg-[#202c33] border-b border-[#222d34] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#00a884]" />
            <h3 className="text-sm font-bold text-[#e9edef]">GIFs & Animated Stickers</h3>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[#2a3942] text-[#8696a0] rounded-lg">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs & Search */}
        <div className="p-3 bg-[#111b21] border-b border-[#222d34] space-y-2">
          <div className="flex bg-[#202c33] p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('stickers')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === 'stickers'
                  ? 'bg-[#00a884] text-[#111b21]'
                  : 'text-[#8696a0] hover:text-[#e9edef]'
              }`}
            >
              Stickers
            </button>
            <button
              onClick={() => setActiveTab('gifs')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
                activeTab === 'gifs'
                  ? 'bg-[#00a884] text-[#111b21]'
                  : 'text-[#8696a0] hover:text-[#e9edef]'
              }`}
            >
              Search GIFs
            </button>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-[#8696a0] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={activeTab === 'stickers' ? 'Filter stickers...' : 'Search Giphy / Tenor...'}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-[#202c33] text-[#e9edef] pl-9 pr-3 py-2 rounded-xl text-xs placeholder-[#8696a0] focus:outline-none focus:ring-1 focus:ring-[#00a884]"
            />
          </div>

          {activeTab === 'gifs' && (
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {POPULAR_SEARCHES.map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    setQuery(tag);
                    searchTenorGifs(tag);
                  }}
                  className="px-2.5 py-1 bg-[#202c33] hover:bg-[#2a3942] rounded-full text-[11px] text-[#8696a0] hover:text-[#00a884] whitespace-nowrap transition"
                >
                  {tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content Grid */}
        <div className="flex-1 overflow-y-auto p-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : gifs.length === 0 ? (
            <div className="text-center py-12 text-xs text-[#8696a0]">No GIFs found</div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {gifs.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectGif(item.url);
                    onClose();
                  }}
                  className="relative group rounded-xl overflow-hidden bg-[#202c33] aspect-square cursor-pointer hover:ring-2 hover:ring-[#00a884] transition"
                >
                  <img
                    src={item.url}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition"
                    loading="lazy"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
