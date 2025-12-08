export const metadata = { title: "Lit Buddy" };
export default function RootLayout({ children }) {
  return (
    <html>
      <body>{children}</body>
    </html>
  );
}
