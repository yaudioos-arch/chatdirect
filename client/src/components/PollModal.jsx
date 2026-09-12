import React, { useState } from 'react';
import { X, Plus, Trash2, BarChart2 } from 'lucide-react';

export default function PollModal({ onClose, onSubmit }) {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [allowMultiple, setAllowMultiple] = useState(false);

  const handleAddOption = () => {
    if (options.length < 8) {
      setOptions([...options, '']);
    }
  };

  const handleRemoveOption = (idx) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== idx));
    }
  };

  const handleOptionChange = (idx, val) => {
    const copy = [...options];
    copy[idx] = val;
    setOptions(copy);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanQ = question.trim();
    const cleanOpts = options.map((o) => o.trim()).filter((o) => o.length > 0);

    if (!cleanQ || cleanOpts.length < 2) {
      alert('Please provide a question and at least 2 options.');
      return;
    }

    const pollData = {
      question: cleanQ,
      allow_multiple: allowMultiple,
      options: cleanOpts.map((text, i) => ({
        id: 'opt_' + i + '_' + Date.now(),
        text,
        voters: []
      }))
    };

    onSubmit(pollData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn select-none">
      <div className="w-full max-w-md bg-[#111b21] border border-[#222d34] rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#222d34]">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-[#00a884]" />
            <h3 className="font-bold text-base text-[#e9edef]">Create a Poll</h3>
          </div>
          <button onClick={onClose} className="p-1 text-[#8696a0] hover:text-[#e9edef] rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#8696a0] uppercase tracking-wider mb-1">
              Poll Question
            </label>
            <input
              type="text"
              placeholder="Ask a question..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
              className="w-full bg-[#202c33] text-[#e9edef] px-3.5 py-2.5 rounded-xl text-xs border border-transparent focus:border-[#00a884] focus:outline-none transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8696a0] uppercase tracking-wider mb-1">
              Options
            </label>
            <div className="space-y-2">
              {options.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs text-[#8696a0] w-4 text-right">{idx + 1}.</span>
                  <input
                    type="text"
                    placeholder={`Option ${idx + 1}`}
                    value={opt}
                    onChange={(e) => handleOptionChange(idx, e.target.value)}
                    required
                    className="flex-1 bg-[#202c33] text-[#e9edef] px-3 py-2 rounded-xl text-xs border border-transparent focus:border-[#00a884] focus:outline-none transition"
                  />
                  {options.length > 2 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveOption(idx)}
                      className="p-1 text-[#8696a0] hover:text-rose-400 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>

            {options.length < 8 && (
              <button
                type="button"
                onClick={handleAddOption}
                className="mt-2.5 flex items-center gap-1.5 text-xs text-[#00a884] hover:underline font-semibold"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Option
              </button>
            )}
          </div>

          <div className="flex items-center justify-between p-3 bg-[#182229] rounded-xl border border-[#222d34]">
            <span className="text-xs text-[#e9edef]">Allow multiple answers</span>
            <input
              type="checkbox"
              checked={allowMultiple}
              onChange={(e) => setAllowMultiple(e.target.checked)}
              className="w-4 h-4 rounded text-[#00a884] accent-[#00a884] cursor-pointer"
            />
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
              type="submit"
              className="px-5 py-2 bg-[#00a884] hover:bg-[#00a884]/90 text-[#111b21] font-semibold text-xs rounded-xl transition shadow"
            >
              Send Poll
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
