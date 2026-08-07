import type { Metadata } from "next";

/**
 * Traceability pages are public by design — a buyer scans the QR on the produce
 * and reads the record without an account — but public is not the same as
 * searchable. Indexing them would put individual farm records, plot names and
 * treatment logs into Google under a token nobody chose to publish.
 *
 * The page itself is a client component and cannot export metadata, so the
 * directive lives here.
 */
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
};

export default function TraceLayout({ children }: { children: React.ReactNode }) {
  return children;
}
