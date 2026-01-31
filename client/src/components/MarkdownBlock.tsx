import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import { renderWithHighlights } from "@/lib/markdown-utils";

const MARKDOWN_COMPONENTS = {
  h2: ({ children }: { children?: ReactNode }) => (
    <h2 className="mt-6 text-xl font-semibold font-display text-slate-900">
      {children ? renderWithHighlights(children) : null}
    </h2>
  ),
  h3: ({ children }: { children?: ReactNode }) => (
    <h3 className="mt-4 text-lg font-semibold font-display text-slate-900">
      {children ? renderWithHighlights(children) : null}
    </h3>
  ),
  p: ({ children }: { children?: ReactNode }) => (
    <p className="mt-3 text-sm leading-7 text-slate-700">
      {children ? renderWithHighlights(children) : null}
    </p>
  ),
  li: ({ children }: { children?: ReactNode }) => (
    <li className="mt-2 text-sm leading-6 text-slate-700">
      {children ? renderWithHighlights(children) : null}
    </li>
  ),
  strong: ({ children }: { children?: ReactNode }) => (
    <strong className="font-semibold text-slate-900">
      {children ? renderWithHighlights(children) : null}
    </strong>
  ),
} as const;

export function MarkdownBlock({ content }: { content: string }) {
  if (!content) return null;
  return <ReactMarkdown components={MARKDOWN_COMPONENTS}>{content}</ReactMarkdown>;
}
