import React, { useState, useRef, useEffect } from 'react';
import { Smile, Search, X } from 'lucide-react';

// Emoji categories with common emojis
const EMOJI_CATEGORIES = [
  {
    name: 'Smileys',
    emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳'],
  },
  {
    name: 'Gestures',
    emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '🫵', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪'],
  },
  {
    name: 'Reactions',
    emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '😈', '👿', '💀', '☠️', '👻', '👽', '👾', '🤖', '💩', '🔥', '⭐', '🌟', '✨', '💫', '⚡', '💥', '💢', '💦', '💧', '🎉', '🎊', '🎈', '🎁', '🏆', '🥇', '🥈', '🥉'],
  },
  {
    name: 'Objects',
    emojis: ['💻', '🖥️', '🖨️', '⌨️', '🖱️', '💾', '💿', '📀', '📱', '📲', '☎️', '📞', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📺', '📻', '🔋', '🔌', '💡', '🔦', '🕯️', '🧯', '🛢️', '💰', '💵', '💴', '💶', '💷', '💸', '💳', '🧾', '💹'],
  },
  {
    name: 'Symbols',
    emojis: ['✓', '✔', '✗', '✘', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔶', '🔷', '🔸', '🔹', '🔺', '🔻', '💠', '��', '🔳', '🔲', '▪️', '▫️', '◾', '◽', '◼️', '◻️', '⬛', '⬜', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '🔱', '⚜️', '🔰', '♻️', '🔷', '🔶', '🅰️', '🅱️', '🅾️', '🅿️', '🈂️', '🈷️'],
  },
  {
    name: 'Code Dev',
    emojis: ['🤖', '👨‍💻', '👩‍💻', '💻', '🖥️', '⌨️', '🖱️', '📦', '📝', '📋', '✅', '❌', '🔧', '🔨', '⚙️', '🔩', '🔗', '📌', '🔖', '🏷️', '📂', '📁', '📊', '📈', '📉', '🗂️', '📅', '📆', '📧', '📨', '📩', '📤', '📥', '📦', '🔍', '🔎', '💡', '🧠', '🎯', '🚀', '⚡', '🔮', '🛠️', '🧮', '📡', '🔬', '🔭', '📱'],
  },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(0);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const filteredEmojis = search
    ? EMOJI_CATEGORIES.flatMap(c => c.emojis).filter(e => e.includes(search))
    : EMOJI_CATEGORIES[activeCategory]?.emojis || [];

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full right-0 mb-2 w-80 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden animate-fade-in-down"
    >
      {/* Header */}
      <div className="flex items-center gap-2 p-3 border-b border-gray-700">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search emojis..."
            className="w-full pl-8 pr-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
            autoFocus
          />
        </div>
        <button onClick={onClose} className="p-1 text-gray-500 hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Categories */}
      {!search && (
        <div className="flex gap-1 p-2 border-b border-gray-700 overflow-x-auto scrollbar-hide">
          {EMOJI_CATEGORIES.map((cat, idx) => (
            <button
              key={cat.name}
              onClick={() => setActiveCategory(idx)}
              className={`px-3 py-1 text-xs rounded-full transition-colors whitespace-nowrap ${
                activeCategory === idx
                  ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Emoji Grid */}
      <div className="p-2 max-h-64 overflow-y-auto">
        <div className="grid grid-cols-8 gap-1">
          {filteredEmojis.slice(0, 60).map((emoji, idx) => (
            <button
              key={`${emoji}-${idx}`}
              onClick={() => {
                onSelect(emoji);
                onClose();
              }}
              className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-800 rounded-lg transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
        {filteredEmojis.length === 0 && (
          <p className="text-center text-gray-500 text-sm py-4">No emojis found</p>
        )}
      </div>
    </div>
  );
}

interface EmojiButtonProps {
  onSelect: (emoji: string) => void;
}

export function EmojiButton({ onSelect }: EmojiButtonProps) {
  const [showPicker, setShowPicker] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setShowPicker(!showPicker)}
        className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-colors"
        title="Add emoji"
      >
        <Smile size={16} />
      </button>
      {showPicker && (
        <EmojiPicker onSelect={onSelect} onClose={() => setShowPicker(false)} />
      )}
    </div>
  );
}