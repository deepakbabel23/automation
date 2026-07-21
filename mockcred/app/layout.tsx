import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MockCred — Practice Exams for Claude Certifications",
  description:
    "Unofficial, realistic practice and mock exams to prepare for Anthropic's Claude Certification exams. Not affiliated with Anthropic.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
