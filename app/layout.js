import { Metadata } from "next";

export const metadata = {
  title: "Lit Buddy",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
