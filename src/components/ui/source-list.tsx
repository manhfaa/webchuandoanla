import { ExternalLink, Globe2 } from "lucide-react";

export interface SourceItem {
  title: string;
  url: string;
  domain: string;
}

export function SourceList({ sources }: { sources: SourceItem[] }) {
  if (!sources?.length) return null;

  return (
    <ul className="flex flex-col gap-2">
      {sources.map((source, index) => (
        <li key={index}>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex min-h-14 items-center justify-between rounded-lg border border-line bg-surface p-3 transition duration-180 hover:-translate-y-px hover:border-leaf/35 hover:bg-surface-soft"
          >
            <div className="flex min-w-0 items-center gap-3 pr-4">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-surface-soft text-leaf-strong">
                <Globe2 className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-ink group-hover:text-leaf-strong">
                  {source.title}
                </span>
                <span className="mt-0.5 block truncate text-xs text-ink-soft">{source.domain}</span>
              </span>
            </div>
            <ExternalLink className="h-4 w-4 shrink-0 text-ink-soft group-hover:text-leaf-strong" />
          </a>
        </li>
      ))}
    </ul>
  );
}
