import React, { useState, useEffect } from 'react';
import { X, Zap, Star } from 'lucide-react';
import { Theme } from './ultrahuman/types';

interface ExitIntentPopupProps {
  theme: Theme;
  userName?: string;
}

export const ExitIntentPopup: React.FC<ExitIntentPopupProps> = ({ theme, userName }) => {
  const [show, setShow] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    // Only show once per session
    if (hasShown) return;

    const handleMouseLeave = (e: MouseEvent) => {
      // Detect mouse leaving from top of viewport (user going to close tab/window)
      if (e.clientY <= 0 && !hasShown) {
        setShow(true);
        setHasShown(true);
      }
    };

    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [hasShown]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)' }}
      onClick={() => setShow(false)}
    >
      <div
        className="relative max-w-2xl w-full rounded-sm p-8 md:p-12 animate-in zoom-in duration-300"
        style={{
          backgroundColor: theme.colors.surface,
          border: `2px solid ${theme.colors.primary}`
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={() => setShow(false)}
          className="absolute top-4 right-4 p-2 rounded hover:opacity-70 transition-opacity"
          style={{ color: theme.colors.textMuted }}
        >
          <X size={24} />
        </button>

        {/* Content */}
        <div className="text-center">
          {/* Icon */}
          <div
            className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
            style={{ backgroundColor: `${theme.colors.primary}20` }}
          >
            <Zap size={40} style={{ color: theme.colors.primary }} />
          </div>

          {/* Title */}
          <h3 className="text-2xl md:text-3xl font-bold mb-4" style={{ color: theme.colors.text }}>
            Attends {userName || ''} !
          </h3>

          {/* Message */}
          <p className="text-base md:text-lg mb-6" style={{ color: theme.colors.textMuted }}>
            Tu pars sans débloquer tes protocoles ?
          </p>

          {/* Offer box */}
          <div
            className="rounded-sm p-6 mb-6"
            style={{
              backgroundColor: `${theme.colors.primary}15`,
              border: `1px solid ${theme.colors.primary}60`
            }}
          >
            <p className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: theme.colors.primary }}>
              Offre Spéciale
            </p>
            <p className="text-xl md:text-2xl font-bold mb-2" style={{ color: theme.colors.text }}>
              Ultimate Scan : 59€ au lieu de 79€
            </p>
            <p className="text-sm" style={{ color: theme.colors.textMuted }}>
              -20€ si tu upgrades maintenant
            </p>
            <p className="text-xs mt-2 font-bold" style={{ color: theme.colors.primary }}>
              ⏱️ Cette popup ne s'affichera qu'UNE SEULE FOIS
            </p>
          </div>

          {/* Social proof */}
          <div className="flex items-center justify-center gap-2 mb-6 text-sm" style={{ color: theme.colors.textMuted }}>
            <Star size={16} className="fill-yellow-400 text-yellow-400" />
            <span>
              "Ces analyses sont juste impressionnantes" ,  Magroud W. ⭐⭐⭐⭐⭐
            </span>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="/offers/ultimate-scan"
              className="flex-1 px-8 py-4 rounded font-bold text-base transition-all hover:scale-105 text-center"
              style={{
                backgroundColor: theme.colors.primary,
                color: theme.type === 'dark' ? '#000' : '#FFF'
              }}
            >
              <span className="flex items-center justify-center gap-2">
                <Zap size={18} />
                Oui, je veux Ultimate (59€)
              </span>
            </a>
            <button
              onClick={() => setShow(false)}
              className="px-8 py-4 rounded font-bold text-base transition-all hover:opacity-70"
              style={{
                backgroundColor: 'transparent',
                border: `1px solid ${theme.colors.border}`,
                color: theme.colors.textMuted
              }}
            >
              Non merci, je reste bloqué
            </button>
          </div>

          {/* Footer note */}
          <p className="text-xs mt-6" style={{ color: theme.colors.textMuted }}>
            💰 100% déductible de ton coaching Achzod • 🎁 Livraison en 24-48h
          </p>
        </div>
      </div>
    </div>
  );
};

export default ExitIntentPopup;
