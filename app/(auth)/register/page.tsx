"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RegisterPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, company_name: companyName },
      },
    });

    if (error) {
      setLoading(false);
      setError(error.message);
      return;
    }

    const provisionRes = await fetch("/api/auth/provision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ companyName }),
    });

    setLoading(false);

    if (!provisionRes.ok) {
      setError("Account created but workspace setup failed. Try signing in.");
      return;
    }

    setSent(true);
  }

  if (sent) {
    return (
      <div>
        <h1 className="font-display text-2xl font-semibold text-navy">Check your email</h1>
        <p className="text-sm text-slate-500 mt-2">
          We sent a verification link to <span className="font-medium">{email}</span>. Confirm it
          to activate your company workspace.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-navy">Create your workspace</h1>
      <p className="text-sm text-slate-500 mt-1 mb-6">Set up SiteClock for your company.</p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">Company name</label>
          <Input required value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Keeptalking Logistics" />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">Your full name</label>
          <Input required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ebenezer Addo" />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">Work email</label>
          <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-700 mb-1.5 block">Password</label>
          <Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <Button type="submit" className="w-full" disabled={loading}>
          {loading ? "Creating…" : "Create workspace"}
        </Button>
      </form>

      <p className="text-sm text-slate-500 text-center mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-accent font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
