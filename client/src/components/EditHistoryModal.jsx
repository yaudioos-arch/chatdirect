import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { X, History, Clock, FileText } from 'lucide-react';
import { format } from 'date-fns';

export default function EditHistoryModal({ message, onClose }) {
  const { getEditHistory } = useSocket();
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!message) return;
    let isMounted = true;
    getEditHistory(message.id).then((history) => {
      if (isMounted) {
        setHistoryList(history || []);
        setLoading(false);
      }
    }).catch(() => {
      if (isMounted) setLoading(false);
    });
    return () => { isMounted = false; };
  }, [message?.id]);

  if (!message) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b141a]/80 backdrop-blur-sm p-4 select-none animate-fadeIn">
      <div className="w-full max-w-md bg-[#111b21] border border-[#222d34] rounded-2xl shadow-2xl p-5 flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#222d34]">
          <div className="flex items-center gap-2 text-[#e9edef]">
            <div className="w-8 h-8 rounded-lg bg-[#00a884]/20 flex items-center justify-center text-[#00a884]">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#e9edef]">Message Edit History</h3>
              <p className="text-[11px] text-[#8696a0]">View previous versions of this message</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#8696a0] hover:text-[#e9edef] hover:bg-[#202c33] rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {/* Current Live Version */}
          <div className="bg-[#202c33] border border-[#00a884]/40 rounded-xl p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] uppercase font-bold tracking-wider text-[#00a884] bg-[#00a884]/15 px-2 py-0.5 rounded-full">
                Current Version
              </span>
              {message.edited_at && (
                <span className="text-[10px] text-[#8696a0] flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {format(new Date(message.edited_at), 'MMM d, h:mm a')}
                </span>
              )}
            </div>
            <p className="text-xs text-[#e9edef] whitespace-pre-wrap break-words leading-relaxed font-normal">
              {message.content}
            </p>
          </div>

          {/* Loading Indicator */}
          {loading ? (
            <div className="py-8 text-center text-xs text-[#8696a0]">
              <div className="w-6 h-6 border-2 border-[#00a884] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <span>Loading previous versions...</span>
            </div>
          ) : historyList.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#8696a0]">
              <FileText className="w-8 h-8 text-[#2a3942] mx-auto mb-2" />
              <span>No prior versions recorded for this message.</span>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="text-[11px] font-semibold text-[#8696a0] uppercase tracking-wider px-1 pt-1">
                Previous Edits ({historyList.length})
              </div>
              {historyList.map((item, index) => (
                <div
                  key={index}
                  className="bg-[#182229] border border-[#222d34] rounded-xl p-3 transition hover:border-[#2a3942]"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-semibold text-[#8696a0]">
                      {index === 0 ? 'Original Version' : `Edit #${index}`}
                    </span>
                    <span className="text-[10px] text-[#8696a0] flex items-center gap-1 font-mono">
                      <Clock className="w-2.5 h-2.5" />
                      {item.edited_at ? format(new Date(item.edited_at), 'MMM d, h:mm a') : 'Original'}
                    </span>
                  </div>
                  <p className="text-xs text-[#8696a0] whitespace-pre-wrap break-words leading-relaxed">
                    {item.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 mt-3 border-t border-[#222d34] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#202c33] hover:bg-[#2a3942] text-xs font-semibold text-[#e9edef] rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
