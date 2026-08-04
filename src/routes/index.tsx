import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, BarChart3, Loader2, ShieldCheck, Sparkle } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — ShopSense Vendor Management" },
      {
        name: "description",
        content:
          "Sign in to ShopSense to manage vendors, catalogues, customers and revenue from a single control room.",
      },
      { property: "og:title", content: "Sign in — ShopSense Vendor Management" },
      {
        property: "og:description",
        content:
          "Sign in to ShopSense to manage vendors, catalogues, customers and revenue from a single control room.",
      },
    ],
  }),
  component: AuthPage,
});

const HIGHLIGHTS = [
  { icon: BarChart3, title: "Live revenue", copy: "Sales, vendor revenue and catalogue depth in one view." },
  { icon: ShieldCheck, title: "Role-aware", copy: "Admins see everything, vendors only see their own books." },
  { icon: Sparkle, title: "AI listings", copy: "Descriptions, tags and image categories generated for you." },
];

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const navigate = useNavigate();
  const { session, loading } = useAuth();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/dashboard", replace: true });
  }, [session, loading, navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim() || password.length < 6) {
      toast.error("Enter a valid email and a password of at least 6 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: { full_name: fullName.trim() || email.split("@")[0] },
          },
        });
        if (error) throw error;
        toast.success("Account created. Welcome to ShopSense.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        toast.success("Signed in.");
      }
      navigate({ to: "/dashboard", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Authentication failed.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    setGoogleBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setGoogleBusy(false);
      toast.error("Google sign-in failed. Try email instead.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard", replace: true });
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_1fr]">
      <section className="ink-gradient relative hidden flex-col justify-between overflow-hidden p-12 lg:flex">
        <div className="grid-fade absolute inset-0" aria-hidden />
        <div className="relative flex items-center gap-3">
          <div className="brand-gradient grid size-10 place-items-center rounded-xl font-display text-lg font-bold text-primary-foreground">
            S
          </div>
          <span className="font-display text-lg font-semibold text-sidebar-accent-foreground">
            ShopSense
          </span>
        </div>

        <div className="relative max-w-lg">
          <p className="text-xs uppercase tracking-[0.22em] text-sidebar-primary">
            Vendor management, refined
          </p>
          <h2 className="mt-4 font-display text-4xl font-semibold leading-tight text-sidebar-accent-foreground">
            Every vendor, product and payout — under one calm dashboard.
          </h2>
          <div className="mt-10 space-y-5">
            {HIGHLIGHTS.map((item) => (
              <div key={item.title} className="flex gap-4">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sidebar-accent text-sidebar-primary">
                  <item.icon className="size-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-sidebar-accent-foreground">
                    {item.title}
                  </p>
                  <p className="text-sm text-sidebar-foreground/70">{item.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-xs text-sidebar-foreground/50">
          Trusted by distribution teams managing 10,000+ SKUs.
        </p>
      </section>

      <section className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-[400px] animate-rise">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="brand-gradient grid size-9 place-items-center rounded-xl font-display font-bold text-primary-foreground">
              S
            </div>
            <span className="font-display text-lg font-semibold">ShopSense</span>
          </div>

          <h1 className="font-display text-[26px] font-semibold tracking-tight">
            {mode === "signin" ? "Welcome back" : "Create your workspace"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Sign in to pick up where your vendors left off."
              : "Start managing vendors, products and revenue in minutes."}
          </p>

          <Button
            type="button"
            variant="outline"
            className="mt-7 h-11 w-full justify-center gap-2.5 rounded-lg"
            onClick={() => void handleGoogle()}
            disabled={googleBusy}
          >
            {googleBusy ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.2-2.1 3.6-5.2 3.6-8.8Z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3a7.2 7.2 0 0 1-10.7-3.8h-4v3.1A12 12 0 0 0 12 24Z"
                />
                <path fill="#FBBC05" d="M5.4 14.3a7.2 7.2 0 0 1 0-4.6v-3.1h-4a12 12 0 0 0 0 10.8l4-3.1Z" />
                <path
                  fill="#EA4335"
                  d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.4 6.6l4 3.1A7.2 7.2 0 0 1 12 4.8Z"
                />
              </svg>
            )}
            Continue with Google
          </Button>

          <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div className="space-y-1.5">
                <Label htmlFor="fullName">Full name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Ava Rodriguez"
                  className="h-11 rounded-lg"
                />
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@company.com"
                className="h-11 rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signin" ? "current-password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 6 characters"
                className="h-11 rounded-lg"
              />
            </div>

            <Button type="submit" className="h-11 w-full rounded-lg" disabled={busy}>
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  {mode === "signin" ? "Sign in" : "Create account"}
                  <ArrowRight className="size-4" />
                </>
              )}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? "New to ShopSense?" : "Already have an account?"}{" "}
            <button
              type="button"
              className="font-medium text-primary underline-offset-4 hover:underline"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      </section>
    </div>
  );
}
