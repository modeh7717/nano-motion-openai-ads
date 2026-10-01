import Link from "next/link";
export default function NotFound() { return <div className="empty-state"><h1>A different path.</h1><p>We couldn’t find this page. Find your next essential instead.</p><Link className="button" href="/shop">Explore the collection ↗︎</Link></div>; }
