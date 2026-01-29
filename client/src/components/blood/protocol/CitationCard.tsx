import { BookOpen } from "lucide-react";

interface CitationCardProps {
  citation: string;
  theme: any;
}

export default function CitationCard({ citation, theme }: CitationCardProps) {
  // Parse citation format: "Author: \"quote\""
  const parts = citation.split(':"');
  const author = parts[0]?.trim() || "Expert";
  const quote = parts[1]?.replace(/"/g, "").trim() || citation;

  return (
    <div
      className="rounded-lg border p-3 text-sm"
      style={{
        backgroundColor: theme.surfaceMuted,
        borderColor: theme.border,
        color: theme.textSecondary,
      }}
    >
      <div className="flex items-start gap-2">
        <BookOpen className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: theme.primaryBlue }} />
        <div>
          <div className="font-semibold" style={{ color: theme.primaryBlue }}>
            {author}
          </div>
          <div className="mt-1 italic">&ldquo;{quote}&rdquo;</div>
        </div>
      </div>
    </div>
  );
}
