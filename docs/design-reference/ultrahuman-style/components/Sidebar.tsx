import React, { useState, useMemo } from 'react';
import { SectionContent, Theme } from '../types';
import { Search } from 'lucide-react';

interface SidebarProps {
  sections: SectionContent[];
  activeSection: string;
  onNavigate: (id: string) => void;
  themes: Theme[];
  currentTheme: Theme;
  onThemeChange: (theme: Theme) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  sections, 
  activeSection, 
  onNavigate,
  themes,
  currentTheme,
  onThemeChange
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter sections based on search
  const filteredSections = useMemo(() => {
    if (!searchTerm) return sections;
    const lower = searchTerm.toLowerCase();
    return sections.filter(s => 
      s.title.toLowerCase().includes(lower) || 
      (s.subtitle && s.subtitle.toLowerCase().includes(lower))
    );
  }, [sections, searchTerm]);
  
  return (
    <nav className="h-full flex flex-col">
      {/* Search Bar for Long Reports */}
      <div className="px-6 mb-4">
        <div className="relative">
          <input 
            type="text" 
            placeholder="Filter pages..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-md py-2 pl-9 pr-3 text-xs text-[var(--color-text)] placeholder-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-primary)] transition-colors"
          />
          <Search className="absolute left-3 top-2.5 text-[var(--color-text-muted)]" size={12} />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-2 custom-scrollbar">
        <div className="space-y-0.5">
          <p className="px-2 text-[10px] font-mono font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-3">
            Table of Contents
          </p>
          
          {filteredSections.length === 0 && (
            <p className="px-2 text-xs text-[var(--color-text-muted)] italic">No sections found.</p>
          )}

          {filteredSections.map((section, idx) => {
            // Find original index for display numbering
            const originalIndex = sections.findIndex(s => s.id === section.id);
            const isActive = activeSection === section.id;

            return (
              <button
                key={section.id}
                onClick={() => onNavigate(section.id)}
                className={`w-full text-left px-3 py-2 text-xs transition-all duration-200 flex items-center gap-3 group relative rounded-md
                  ${isActive 
                    ? 'bg-[var(--color-surface)] text-[var(--color-text)] font-medium' 
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]/50'
                  }`}
              >
                <span className={`font-mono text-[10px] ${isActive ? 'opacity-100' : 'opacity-40'}`}>
                  {originalIndex + 1 < 10 ? `0${originalIndex + 1}` : originalIndex + 1}
                </span>
                <span className="truncate">{section.title}</span>
                
                {isActive && (
                   <div className="absolute right-2 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: currentTheme.colors.primary }}></div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-6 border-t border-[var(--color-border)] mt-auto">
        <p className="text-[10px] font-mono font-bold text-[var(--color-text-muted)] uppercase tracking-widest mb-3">Theme Engine</p>
        <div className="grid grid-cols-2 gap-2">
            {themes.map((theme) => (
              <button
                key={theme.id}
                onClick={() => onThemeChange(theme)}
                className={`flex items-center justify-center gap-2 text-[10px] p-2 rounded border transition-all
                  ${currentTheme.id === theme.id 
                    ? 'border-[var(--color-text)] bg-[var(--color-surface)] text-[var(--color-text)] font-bold shadow-sm' 
                    : 'border-transparent bg-[var(--color-bg)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
                  }
                `}
              >
                <div 
                  className="w-2 h-2 rounded-full border border-white/10"
                  style={{ backgroundColor: theme.colors.background }}
                />
                {theme.name.split(' ')[0]}
              </button>
            ))}
        </div>
      </div>
    </nav>
  );
};