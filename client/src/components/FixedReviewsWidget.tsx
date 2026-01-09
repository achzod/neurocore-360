import { useState } from "react";
import { Star, X, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const REVIEWS = [
  {
    name: "Thomas D.",
    role: "Entrepreneur",
    content: "Le rapport m'a ouvert les yeux sur mes déséquilibres hormonaux. En 3 mois, j'ai retrouvé mon énergie.",
    rating: 5,
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
  },
  {
    name: "Sophie M.",
    role: "Athlète CrossFit",
    content: "L'analyse biomécanique a identifié mes compensations. Mes performances ont explosé depuis.",
    rating: 5,
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
  },
  {
    name: "Marc L.",
    role: "Cadre dirigeant",
    content: "Le Burnout Engine m'a littéralement sauvé. J'étais au bord du gouffre sans le savoir.",
    rating: 5,
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
  },
  {
    name: "Julie R.",
    role: "Coach sportive",
    content: "J'utilise APEX LABS pour tous mes clients. Les rapports sont incroyablement détaillés.",
    rating: 5,
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face",
  },
];

export function FixedReviewsWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [currentReview, setCurrentReview] = useState(0);

  const scrollToReviews = () => {
    const element = document.getElementById("reviews");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
      setIsOpen(false);
    }
  };

  if (!isVisible) return null;

  const review = REVIEWS[currentReview];

  return (
    <>
      {/* Floating Button - Top Left Side */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onClick={() => setIsOpen(true)}
            className="fixed top-24 left-4 z-50 flex items-center gap-3 rounded-full bg-background border border-border px-4 py-3 shadow-lg hover:shadow-xl transition-shadow"
          >
            <img
              src={review.image}
              alt={review.name}
              className="h-10 w-10 rounded-full object-cover"
            />
            <div className="text-left">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-xs text-muted-foreground">Avis vérifiés</p>
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Expanded Panel - Top Left */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, x: -20, scale: 0.95 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.95 }}
            className="fixed top-24 left-4 z-50 w-80 rounded-sm bg-background border border-border shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <span className="text-sm font-medium">4.9/5</span>
                <span className="text-xs text-muted-foreground">(avis vérifiés)</span>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-muted rounded-full transition-colors"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            {/* Review Content */}
            <div className="p-4">
              <div className="flex gap-3">
                <img
                  src={review.image}
                  alt={review.name}
                  className="h-12 w-12 rounded-full object-cover flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex gap-0.5 mb-1">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Star key={i} className="h-3 w-3 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-sm text-foreground line-clamp-3">{review.content}</p>
                  <div className="mt-2">
                    <p className="text-sm font-medium">{review.name}</p>
                    <p className="text-xs text-muted-foreground">{review.role}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Dots */}
            <div className="flex justify-center gap-1.5 pb-3">
              {REVIEWS.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentReview(index)}
                  className={`h-1.5 rounded-full transition-all ${
                    currentReview === index
                      ? "w-4 bg-primary"
                      : "w-1.5 bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>

            {/* CTA - scrolls to reviews section */}
            <button
              onClick={scrollToReviews}
              className="flex w-full items-center justify-center gap-2 border-t border-border bg-muted/30 px-4 py-3 text-sm font-medium text-primary hover:bg-muted/50 transition-colors"
            >
              Voir tous les avis
              <ChevronRight className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
