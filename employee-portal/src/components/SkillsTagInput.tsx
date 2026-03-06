import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { apiGet } from '@/utils/api';

interface SkillsTagInputProps {
  value: string[];
  onChange: (skills: string[]) => void;
  placeholder?: string;
  suggestionsEndpoint?: string;
}

export default function SkillsTagInput({
  value,
  onChange,
  placeholder = 'Type a skill and press Enter',
  suggestionsEndpoint = '/portal/hiring-manager/skills-suggestions',
}: SkillsTagInputProps) {
  const [input, setInput] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);

  useEffect(() => {
    if (input.length > 0) {
      const timer = setTimeout(async () => {
        try {
          const data = await apiGet<{ suggestions: string[] }>(
            `${suggestionsEndpoint}?search=${encodeURIComponent(input)}`
          );
          setSuggestions(data.suggestions.filter(s => !value.includes(s)));
        } catch {
          setSuggestions([]);
        }
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setSuggestions([]);
    }
  }, [input, value, suggestionsEndpoint]);

  const addSkill = (skill: string) => {
    if (skill && !value.includes(skill)) {
      onChange([...value, skill]);
    }
    setInput('');
    setSuggestions([]);
  };

  const removeSkill = (skill: string) => {
    onChange(value.filter(s => s !== skill));
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-2">
        {value.map(skill => (
          <span
            key={skill}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-sm"
          >
            {skill}
            <button type="button" onClick={() => removeSkill(skill)} className="hover:text-blue-900">
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && input.trim()) {
              e.preventDefault();
              addSkill(input.trim());
            }
          }}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder={placeholder}
        />
        {suggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
            {suggestions.map(s => (
              <button
                key={s}
                type="button"
                onClick={() => addSkill(s)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300"
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
