import React, { useState } from 'react';
import { X, MapPin, Navigation } from 'lucide-react';

const PRESET_PLACES = [
  { name: 'Current Location', address: 'Near Central Park, New York', lat: 40.785091, lng: -73.968285 },
  { name: 'Coffee Shop', address: 'Blue Bottle Coffee, Manhattan', lat: 40.758896, lng: -73.985130 },
  { name: 'Workplace / Office', address: 'Tech Innovation Hub, 5th Ave', lat: 40.748440, lng: -73.985664 },
  { name: 'Airport', address: 'JFK International Airport, Terminal 4', lat: 40.641311, lng: -73.778139 }
];

export default function LocationModal({ onClose, onSubmit }) {
  const [selectedPlace, setSelectedPlace] = useState(PRESET_PLACES[0]);
  const [customName, setCustomName] = useState('');
  const [customAddress, setCustomAddress] = useState('');

  const handleShare = () => {
    const locData = {
      name: customName.trim() || selectedPlace.name,
      address: customAddress.trim() || selectedPlace.address,
      lat: selectedPlace.lat,
      lng: selectedPlace.lng
    };
    onSubmit(locData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn select-none">
      <div className="w-full max-w-md bg-[#111b21] border border-[#222d34] rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#222d34]">
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#00a884]" />
            <h3 className="font-bold text-base text-[#e9edef]">Share Location</h3>
          </div>
          <button onClick={onClose} className="p-1 text-[#8696a0] hover:text-[#e9edef] rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Map Mockup Preview */}
        <div className="w-full h-36 rounded-xl bg-[#182229] border border-[#222d34] relative overflow-hidden flex items-center justify-center mb-4">
          <div className="absolute inset-0 opacity-25 bg-[radial-gradient(#00a884_1px,transparent_1px)] [background-size:16px_16px]" />
          <div className="relative flex flex-col items-center text-center p-3 z-10">
            <div className="w-9 h-9 rounded-full bg-[#00a884]/20 border border-[#00a884] flex items-center justify-center text-[#00a884] mb-1.5 shadow-lg animate-bounce">
              <MapPin className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-[#e9edef]">{selectedPlace.name}</p>
            <p className="text-[11px] text-[#8696a0]">{selectedPlace.address}</p>
          </div>
        </div>

        {/* Preset Locations */}
        <div className="space-y-1.5 mb-4">
          <label className="block text-xs font-semibold text-[#8696a0] uppercase tracking-wider mb-1">
            Choose Location Preset
          </label>
          {PRESET_PLACES.map((place, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setSelectedPlace(place);
                setCustomName('');
                setCustomAddress('');
              }}
              className={`w-full p-2.5 rounded-xl border flex items-center gap-3 text-left transition ${
                selectedPlace.name === place.name
                  ? 'bg-[#00a884]/15 border-[#00a884]'
                  : 'bg-[#202c33] border-transparent hover:border-[#2a3942]'
              }`}
            >
              <Navigation className="w-4 h-4 text-[#00a884] flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#e9edef] truncate">{place.name}</p>
                <p className="text-[10px] text-[#8696a0] truncate">{place.address}</p>
              </div>
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs text-[#8696a0] hover:text-[#e9edef] rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="px-5 py-2 bg-[#00a884] hover:bg-[#00a884]/90 text-[#111b21] font-semibold text-xs rounded-xl transition shadow"
          >
            Share Location
          </button>
        </div>
      </div>
    </div>
  );
}
