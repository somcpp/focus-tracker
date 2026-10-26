"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-client";
import { Button, Modal } from "./ui";
import { Check, Copy, Laptop, RefreshCw, Sparkles } from "lucide-react";

interface DesktopPairModalProps {
  open: boolean;
  onClose: () => void;
}

export function DesktopPairModal({ open, onClose }: DesktopPairModalProps) {
  const { user, token } = useAuth();
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateCode = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/auth/desktop-pair", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ action: "generate" }),
      });

      const data = await res.json();
      if (res.ok && data.code) {
        setCode(data.code);
      } else {
        setError(data.error || "Failed to generate pairing code");
      }
    } catch {
      setError("Network error while generating code");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && user && !code) {
      generateCode();
    }
  }, [open, user]);

  const handleCopy = () => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal open={open} onClose={onClose} title="Pair Desktop Island">
      <div className="flex flex-col gap-5 py-1">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-500/20">
            <Laptop size={20} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-ink">Connect Floating Desktop Island</h4>
            <p className="text-xs text-muted">Keep your active focus timer and tasks visible over LeetCode & VS Code</p>
          </div>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-500">
            {error}
          </div>
        ) : null}

        <div className="flex flex-col items-center justify-center rounded-2xl border border-line bg-card-2 p-5 text-center">
          <p className="text-xs font-medium text-muted">Your 6-Digit Pairing Code</p>

          <div className="my-3 flex items-center justify-center gap-2">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-muted">
                <RefreshCw size={16} className="animate-spin" />
                <span>Generating code...</span>
              </div>
            ) : code ? (
              <div className="flex items-center gap-2">
                <span className="font-mono text-3xl font-black tracking-widest text-ink select-all">
                  {code.slice(0, 3)} {code.slice(3)}
                </span>
                <button
                  onClick={handleCopy}
                  title="Copy code"
                  className="grid h-8 w-8 place-items-center rounded-lg border border-line bg-card hover:bg-card-2 text-ink transition active:scale-95"
                >
                  {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                </button>
              </div>
            ) : (
              <span className="text-sm text-muted">No code generated</span>
            )}
          </div>

          <p className="text-[11px] text-muted">
            Valid for 15 minutes. One-time use.
          </p>
        </div>

        <div className="space-y-2 text-xs text-muted">
          <p className="font-semibold text-ink">How to connect:</p>
          <ol className="list-decimal space-y-1 pl-4">
            <li>Open the <strong>Focus Tracker Island</strong> on your desktop.</li>
            <li>Click <strong>&quot;Connect Account&quot;</strong> on the island.</li>
            <li>Enter this 6-digit code to pair instantly!</li>
          </ol>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-line">
          <Button
            variant="secondary"
            onClick={generateCode}
            disabled={loading}
            className="flex items-center gap-1.5"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Generate New Code</span>
          </Button>
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
}
