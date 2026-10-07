import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Typeform Clone — Forms people enjoy filling",
  description: "Build conversational forms one question at a time.",
};

const FONT_URL =
  "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Karla:wght@400;500;700&family=Montserrat:wght@400;500;700&family=Space+Grotesk:wght@400;500;700&family=Lora:wght@400;500;700&family=Playfair+Display:wght@400;700&family=DM+Sans:wght@400;500;700&family=Poppins:wght@400;500;700&display=swap";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONT_URL} />
      </head>
      <body>
        {children}
        <Toaster
          position="bottom-center"
          toastOptions={{
            style: { background: "#191919", color: "#fff", border: "none", borderRadius: 8, fontSize: 14 },
          }}
        />
      </body>
    </html>
  );
}
