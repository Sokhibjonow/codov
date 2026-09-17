import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="mb-4 inline-flex items-center gap-1.5 text-sm font-bold text-muted hover:text-primary">
      <ArrowLeft size={16} />
      {label}
    </Link>
  );
}
