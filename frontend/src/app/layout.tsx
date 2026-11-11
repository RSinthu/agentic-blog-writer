import type { Metadata } from "next";
import { IBM_Plex_Mono, Instrument_Serif, Newsreader } from "next/font/google";
import "./globals.css";

const display = Instrument_Serif({
  variable: "--font-instrument",
  weight: "400",
  style: ["normal", "italic"],
  subsets: ["latin"],
});

const serif = Newsreader({
  variable: "--font-newsreader",
  style: ["normal", "italic"],
  axes: ["opsz"],
  subsets: ["latin"],
});

const mono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  weight: ["400", "500"],
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Galley | Your writing workspace",
  description: "Turn a brief into a researched, cited technical article.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning className={`${display.variable} ${serif.variable} ${mono.variable} h-full`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `(function(){var t;try{t=localStorage.getItem("galley-theme")}catch(e){}document.documentElement.dataset.theme=t==="light"||t==="dark"?t:window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"})()` }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
