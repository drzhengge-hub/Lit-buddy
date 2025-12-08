
export const metadata = { title: "Lit Buddy" };
export default function RootLayout({ children }) {
  return (
    <html>
      <body style={{ fontFamily: 'Arial', padding: 20 }}>
        <h1>Lit Buddy</h1>
        {children}
      </body>
    </html>
  );
}
