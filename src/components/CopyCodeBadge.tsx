"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export default function CopyCodeBadge({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="کپی کد کلاس"
      className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[#00ffa3]/25 bg-[#00ffa3]/10 px-3 py-1 text-xs font-semibold text-[#00ffa3] transition hover:bg-[#00ffa3]/20"
    >
      <span>کد:</span>
      <span className="font-mono tracking-widest">{code}</span>
      {copied ? (
        <Check className="h-3.5 w-3.5 text-[#00ffa3]" />
      ) : (
        <Copy className="h-3.5 w-3.5 opacity-75" />
      )}
      {copied && <span className="text-[10px]">کپی شد!</span>}
    </button>
  );
}
