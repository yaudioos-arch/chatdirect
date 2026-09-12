import React, { useState, useEffect } from 'react';
import { useSocket } from '../context/SocketContext';
import { Lock, Delete, ShieldCheck, KeyRound } from 'lucide-react';

export default function ChatLockScreen({ contact }) {
  const { chatSettings, unlockChat } = useSocket();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const targetPin = chatSettings?.lock_pin || '';

  const handleDigit = (digit) => {
    if (pin.length < 6) {
      const next = pin + digit;
      setPin(next);
      checkPin(next);
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  const checkPin = (entered) => {
    if (targetPin && entered.length >= targetPin.length) {
      if (entered === targetPin) {
        unlockChat(contact.id);
      } else {
        setError(true);
        setTimeout(() => {
          setPin('');
          setError(false);
        }, 600);
      }
    }
  };

  // Keyboard input listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (/^[0-9]$/.test(e.key)) {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleDelete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, targetPin]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none chat-bg-pattern animate-fadeIn">
      <div className="w-full max-w-xs bg-[#111b21]/95 border border-[#222d34] rounded-3xl p-6 shadow-2xl backdrop-blur-md">
        <div className="w-16 h-16 rounded-3xl bg-[#182229] border border-[#222d34] flex items-center justify-center mx-auto mb-4 text-[#00a884] shadow-lg shadow-black/40">
          <Lock className="w-8 h-8 text-[#00a884]" />
        </div>

        <h3 className="text-lg font-bold text-[#e9edef] tracking-tight">
          Conversation Locked
        </h3>
        <p className="text-xs text-[#8696a0] mt-1 mb-6">
          Enter PIN to view chat with <span className="text-[#e9edef] font-semibold">{contact.display_name}</span>
        </p>

        {/* PIN Dots display */}
        <div className={`flex justify-center gap-3 mb-6 ${error ? 'animate-bounce text-rose-500' : ''}`}>
          {[...Array(targetPin.length || 4)].map((_, i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full border-2 transition-all ${
                i < pin.length
                  ? error
                    ? 'bg-rose-500 border-rose-500 scale-110'
                    : 'bg-[#00a884] border-[#00a884] scale-110'
                  : 'border-[#8696a0]/40 bg-transparent'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-xs text-rose-400 font-medium mb-4 animate-fadeIn">
            Incorrect PIN. Try again.
          </p>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[220px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="w-14 h-14 rounded-2xl bg-[#202c33] hover:bg-[#2a3942] active:scale-95 text-[#e9edef] text-lg font-semibold border border-[#222d34] transition flex items-center justify-center shadow"
            >
              {digit}
            </button>
          ))}
          <div />
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="w-14 h-14 rounded-2xl bg-[#202c33] hover:bg-[#2a3942] active:scale-95 text-[#e9edef] text-lg font-semibold border border-[#222d34] transition flex items-center justify-center shadow"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="w-14 h-14 rounded-2xl bg-[#202c33] hover:bg-[#2a3942] active:scale-95 text-[#8696a0] hover:text-[#e9edef] border border-[#222d34] transition flex items-center justify-center shadow"
            title="Delete digit"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
