import React, { useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { X, Lock, Unlock, KeyRound, AlertCircle, Check } from 'lucide-react';

export default function ChatLockModal({ contact, onClose }) {
  const { chatSettings, setChatLock, lockChat } = useSocket();
  const isCurrentlyLocked = contact?.isLocked || chatSettings?.is_locked === 1;

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [currentPin, setCurrentPin] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleEnableLock = async (e) => {
    e.preventDefault();
    setError('');
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    await setChatLock(contact.id, true, pin);
    setSuccess('Conversation locked with PIN!');
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleDisableLock = async (e) => {
    e.preventDefault();
    setError('');
    if (chatSettings.lock_pin && currentPin !== chatSettings.lock_pin) {
      setError('Incorrect current PIN');
      return;
    }

    await setChatLock(contact.id, false, '');
    setSuccess('Screen lock removed');
    setTimeout(() => {
      onClose();
    }, 600);
  };

  const handleImmediateLock = () => {
    lockChat(contact.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b141a]/80 backdrop-blur-sm p-4 select-none animate-fadeIn">
      <div className="w-full max-w-sm bg-[#111b21] border border-[#222d34] rounded-2xl shadow-2xl p-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#222d34]">
          <div className="flex items-center gap-2 text-[#e9edef]">
            <div className="w-8 h-8 rounded-lg bg-[#00a884]/20 flex items-center justify-center text-[#00a884]">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#e9edef]">Screen Lock</h3>
              <p className="text-[11px] text-[#8696a0]">{contact?.display_name}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8696a0] hover:text-[#e9edef] hover:bg-[#202c33] rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="mb-3 p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-3 p-2.5 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {isCurrentlyLocked ? (
          <form onSubmit={handleDisableLock} className="space-y-4">
            <p className="text-xs text-[#8696a0] leading-relaxed">
              This conversation is currently protected with a PIN lock. You can lock it immediately or remove the lock by confirming your PIN.
            </p>

            <div>
              <label className="block text-[11px] font-semibold text-[#8696a0] uppercase tracking-wider mb-1.5">
                Enter Current PIN to Unlock or Remove
              </label>
              <input
                type="password"
                maxLength={6}
                value={currentPin}
                onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full bg-[#202c33] text-[#e9edef] text-center text-lg tracking-widest py-2 rounded-xl border border-[#222d34] focus:outline-none focus:border-[#00a884]"
                autoFocus
              />
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                type="button"
                onClick={handleImmediateLock}
                className="w-full py-2.5 bg-[#202c33] hover:bg-[#2a3942] text-xs font-semibold text-amber-400 border border-amber-500/20 rounded-xl transition flex items-center justify-center gap-2"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Lock Conversation Now</span>
              </button>
              <button
                type="submit"
                className="w-full py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Remove PIN Lock</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleEnableLock} className="space-y-3.5">
            <p className="text-xs text-[#8696a0] leading-relaxed">
              Protect this conversation with a PIN code. A lock screen will appear requiring your PIN before any messages can be viewed.
            </p>

            <div>
              <label className="block text-[11px] font-semibold text-[#8696a0] uppercase tracking-wider mb-1">
                Create 4-digit PIN
              </label>
              <input
                type="password"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full bg-[#202c33] text-[#e9edef] text-center text-lg tracking-widest py-2 rounded-xl border border-[#222d34] focus:outline-none focus:border-[#00a884]"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#8696a0] uppercase tracking-wider mb-1">
                Confirm PIN
              </label>
              <input
                type="password"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                placeholder="••••"
                className="w-full bg-[#202c33] text-[#e9edef] text-center text-lg tracking-widest py-2 rounded-xl border border-[#222d34] focus:outline-none focus:border-[#00a884]"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 bg-[#202c33] hover:bg-[#2a3942] text-xs font-semibold text-[#e9edef] rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 py-2 bg-[#00a884] hover:bg-[#008f6f] text-xs font-bold text-[#111b21] rounded-xl transition shadow"
              >
                Lock Chat
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
