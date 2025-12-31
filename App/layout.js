export const metadata = {
  title: "Lit Buddy",
  description: "Your AI reading companion",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
