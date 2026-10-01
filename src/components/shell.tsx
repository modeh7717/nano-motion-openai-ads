"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useCommerce, useMeasurement } from "./runtime";
import { measurement } from "@/lib/measurement/openaiPixel";
import { money } from "@/data/products";
export function Header() {
  const { cart } = useCommerce(); const path = usePathname();
  const count = cart.reduce((n, i) => n + i.quantity, 0);
  return <><div className="announcement">Made for movement. Designed for every day. <span>Free shipping in this demo</span></div><header className="header"><Link href="/" className="wordmark" aria-label="Nano Motion home">nano<span>motion</span><i>↗︎</i></Link><nav aria-label="Main navigation"><Link href="/shop" aria-current={path === "/shop" ? "page" : undefined}>Shop the collection</Link><Link href="/membership" aria-current={path.startsWith("/membership") ? "page" : undefined}>Nano Plus</Link></nav><Link href="/cart" className="bag" aria-label={`Cart, ${count} items`}><svg width="20" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="M5 7h14l1 14H4L5 7Z"/><path d="M8 8V6a4 4 0 0 1 8 0v2"/></svg><span>Bag ({count})</span></Link></header></>;
}
export function Footer() {
  return <footer className="footer"><div><Link href="/" className="wordmark">nano<span>motion</span><i>↗︎</i></Link><p>For wherever movement takes you.</p></div><div className="footer-links"><Link href="/shop">Collection</Link><Link href="/membership">Nano Plus</Link><button onClick={() => measurement.setConsent("unknown")}>Measurement preferences</button></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Nano Motion</span><span>Demo storefront · No real purchases or billing</span></div></footer>;
}
export function ConsentBanner() {
  const { consent } = useMeasurement(); const { hydrated } = useCommerce();
  if (!hydrated || consent !== "unknown") return null;
  return <aside className="consent" aria-label="Measurement consent"><div><strong>Your choice, your movement.</strong><p>Allow advertising measurement to help us understand this demo journey? Shopping works either way. You can change your choice in the footer.</p></div><div className="consent-actions"><button className="button" onClick={() => measurement.setConsent("accepted")}>Accept measurement</button><button className="button outline" onClick={() => measurement.setConsent("declined")}>Decline</button></div></aside>;
}
export function StorageNotice() {
  const { hydrated, storageAvailable } = useCommerce();
  return hydrated && !storageAvailable ? <p className="storage-notice" role="status">Browser storage is unavailable. Your demo cart and confirmations will last only for this visit.</p> : null;
}
export function Inspector() {
  const { logs, consent, sdk } = useMeasurement();
  const [enabled, setEnabled] = useState(false); const [open, setOpen] = useState(false);
  useEffect(() => { setEnabled(process.env.NODE_ENV === "development" || new URLSearchParams(location.search).get("measurementDebug") === "true"); }, []);
  if (!enabled) return null;
  return <aside className="inspector"><button className="inspector-toggle" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? "Close" : "Open"} local instrumentation log <span>{logs.length}</span></button>{open && <div className="inspector-panel"><div className="inspector-heading"><strong>Local instrumentation log</strong><button onClick={measurement.clearLog}>Clear</button></div><p>Consent: {consent} · SDK: {sdk}</p><p>Local activity only. OpenAI receipt and attribution are unconfirmed.</p>{sdk === "unconfigured" && <p className="inspector-warning">Live Pixel is disabled pending official documentation verification.</p>}<ol>{logs.toReversed().map(log => <li key={log.id}><div><time>{new Date(log.timestamp).toLocaleTimeString()}</time> <strong>{log.name}</strong> <span className={`status ${log.status}`}>{log.status}</span></div><p>{log.data.contents?.map(i => `${i.id}${i.quantity ? ` × ${i.quantity}` : ""}`).join(", ") || log.data.planId}{log.data.amount !== undefined && ` · ${money(log.data.amount)} ${log.data.currency}`}</p>{log.eventId && <code>{log.eventId}</code>}<small>{log.reason}</small></li>)}</ol>{!logs.length && <p>No events recorded yet.</p>}</div>}</aside>;
}
