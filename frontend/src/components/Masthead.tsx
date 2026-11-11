"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { getHealth } from "@/lib/api";

export function Masthead() {
  const [online, setOnline] = useState<boolean | null>(null);
  useEffect(() => {
    const ac = new AbortController();
    const check = () => getHealth(ac.signal).then(setOnline);
    check();
    const id = setInterval(check, 15000);
    return () => { clearInterval(id); ac.abort(); };
  }, []);
  return <header className="app-header"><div className="header-inner"><Link href="/" className="brand" aria-label="Galley home"><span className="brand-mark" aria-hidden>g.</span><span>galley<span className="brand-dot">.</span></span></Link><span className="workspace-label">Writing workspace</span><div className="connection" role="status"><span className={`status-dot ${online === true ? "online" : online === false ? "offline" : ""}`} />{online === null ? "Connecting" : online ? "Connected" : "Service unavailable"}</div><ThemeToggle /></div></header>;
}
