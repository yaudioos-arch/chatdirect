import React, { useState } from 'react';
import { X, Clock, Calendar } from 'lucide-react';

export default function ScheduleModal({ onClose, onSchedule }) {
  const [minutes, setMinutes] = useState(15);
  const [customDateTime, setCustomDateTime] = useState('');
  const [mode, setMode] = useState('quick'); // 'quick' | 'custom'

  const handleConfirm = () => {
    let targetTime;
    if (mode === 'quick') {
      targetTime = Date.now() + minutes * 60 * 1000;
    } else {
      if (!customDateTime) {
        alert('Please pick a valid date and time');
        return;
      }
      targetTime = new Date(customDateTime).getTime();
      if (targetTime <= Date.now()) {
        alert('Please select a future time');
        return;
      }
    }
    onSchedule(targetTime);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn select-none">
      <div className="w-full max-w-sm bg-[#111b21] border border-[#222d34] rounded-2xl shadow-2xl p-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#222d34]">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#00a884]" />
            <h3 className="font-bold text-sm text-[#e9edef]">Schedule Message</h3>
          </div>
          <button onClick={onClose} className="p-1 text-[#8696a0] hover:text-[#e9edef] rounded-lg transition">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="my-4 space-y-3">
          <div className="flex bg-[#202c33] p-1 rounded-xl">
            <button
              onClick={() => setMode('quick')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                mode === 'quick' ? 'bg-[#00a884] text-[#111b21]' : 'text-[#8696a0]'
              }`}
            >
              Quick Timer
            </button>
            <button
              onClick={() => setMode('custom')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition ${
                mode === 'custom' ? 'bg-[#00a884] text-[#111b21]' : 'text-[#8696a0]'
              }`}
            >
              Custom Date/Time
            </button>
          </div>

          {mode === 'quick' ? (
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'In 5m', val: 5 },
                { label: 'In 15m', val: 15 },
                { label: 'In 30m', val: 30 },
                { label: 'In 1h', val: 60 },
                { label: 'In 2h', val: 120 },
                { label: 'In 24h', val: 1440 }
              ].map((opt) => (
                <button
                  key={opt.val}
                  onClick={() => setMinutes(opt.val)}
                  className={`p-2.5 rounded-xl border text-xs font-medium transition ${
                    minutes === opt.val
                      ? 'bg-[#00a884]/20 border-[#00a884] text-[#00a884]'
                      : 'bg-[#202c33] border-transparent hover:border-[#2a3942] text-[#e9edef]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-[#8696a0] mb-1.5">
                Select Date & Time
              </label>
              <input
                type="datetime-local"
                value={customDateTime}
                onChange={(e) => setCustomDateTime(e.target.value)}
                className="w-full bg-[#202c33] text-[#e9edef] px-3.5 py-2.5 rounded-xl text-xs border border-transparent focus:border-[#00a884] focus:outline-none transition"
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-[#222d34]">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs text-[#8696a0] hover:text-[#e9edef] rounded-xl transition"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-4 py-1.5 bg-[#00a884] hover:bg-[#00a884]/90 text-[#111b21] font-semibold text-xs rounded-xl transition shadow"
          >
            Schedule
          </button>
        </div>
      </div>
    </div>
  );
}
