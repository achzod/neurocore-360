'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Info, ExternalLink } from 'lucide-react';

interface Citation {
  expert: string;
  avatar?: string;
  quote: string;
  source?: string;
  sourceUrl?: string;
}

interface CitationTooltipProps {
  term: string;
  definition: string;
  citations?: Citation[];
  children?: React.ReactNode;
}

export const CitationTooltip = ({
  term,
  definition,
  citations = [],
  children,
}: CitationTooltipProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  let hoverTimeout: NodeJS.Timeout;

  const handleMouseEnter = () => {
    setIsHovered(true);
    hoverTimeout = setTimeout(() => {
      setShowTooltip(true);
    }, 500); // Delay 500ms
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    clearTimeout(hoverTimeout);
    setShowTooltip(false);
  };

  return (
    <span
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Trigger element */}
      <span className="relative cursor-help">
        {children || (
          <span
            className="font-semibold underline decoration-dotted decoration-cyan-500/50 underline-offset-2"
            style={{ color: isHovered ? '#06b6d4' : 'inherit' }}
          >
            {term}
            <Info className="inline w-3 h-3 ml-1 text-cyan-500/70" />
          </span>
        )}
      </span>

      {/* Tooltip */}
      <AnimatePresence>
        {showTooltip && (
          <motion.div
            className="absolute z-50 w-80 bottom-full left-1/2 -translate-x-1/2 mb-2 pointer-events-none"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
          >
            <div
              className="rounded-xl p-4 shadow-2xl"
              style={{
                background: 'rgba(15, 18, 25, 0.95)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(6, 182, 212, 0.3)',
                boxShadow: '0 0 40px rgba(6, 182, 212, 0.2)',
              }}
            >
              {/* Term */}
              <h4 className="text-sm font-bold text-cyan-400 mb-2 uppercase tracking-wider">
                {term}
              </h4>

              {/* Definition */}
              <p className="text-sm text-slate-300 leading-relaxed mb-3">
                {definition}
              </p>

              {/* Citations */}
              {citations.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-slate-700">
                  {citations.map((citation, idx) => (
                    <div key={idx} className="flex gap-3">
                      {/* Avatar */}
                      {citation.avatar && (
                        <div className="flex-shrink-0">
                          <img
                            src={citation.avatar}
                            alt={citation.expert}
                            className="w-10 h-10 rounded-full border-2 border-cyan-500/30"
                          />
                        </div>
                      )}

                      {/* Quote */}
                      <div className="flex-1">
                        <div className="text-xs font-semibold text-cyan-400 mb-1">
                          {citation.expert}
                        </div>
                        <blockquote className="text-xs text-slate-400 italic leading-relaxed">
                          "{citation.quote}"
                        </blockquote>

                        {/* Source link */}
                        {citation.source && citation.sourceUrl && (
                          <a
                            href={citation.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-2 text-xs text-cyan-500 hover:text-cyan-400 transition-colors pointer-events-auto"
                          >
                            <span>{citation.source}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Arrow */}
              <div
                className="absolute top-full left-1/2 -translate-x-1/2 w-3 h-3 rotate-45"
                style={{
                  background: 'rgba(15, 18, 25, 0.95)',
                  border: '1px solid rgba(6, 182, 212, 0.3)',
                  borderTop: 'none',
                  borderLeft: 'none',
                  marginTop: '-6px',
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
};
