import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lit Buddy",
  description: "Your AI reading companion",
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
