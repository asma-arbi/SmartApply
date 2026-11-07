"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { pathAfterLogin } from "@/lib/roles";
import { useAuth } from "@/hooks/use-auth";
import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email.includes("@") || password.trim().length < 8) {
      setError("Email valide et mot de passe (8+) sont requis.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const account = await login(email, password);
      router.push(pathAfterLogin(account.role, params.get("next")));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connexion impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-4xl overflow-hidden rounded-2xl border border-border bg-card shadow-[0_16px_40px_rgba(15,23,42,0.08)] md:grid-cols-[1.05fr_0.95fr]">
      <div className="hidden flex-col justify-between bg-primary p-9 text-white md:flex">
        <Logo inverted />
        <div>
          <h1 className="text-[2rem] font-semibold leading-tight tracking-tight">
            Recruter, conseiller, candidater.
          </h1>
          <p className="mt-4 max-w-sm text-sm leading-7 text-white/80">
            Publiez une annonce, lisez le fil carrière, ou rédigez une lettre
            FR/EN — tout reste dans SmartApply.
          </p>
        </div>
        <p className="text-xs font-medium tracking-wide text-white/70">
          Entreprise · Candidat · Admin
        </p>
      </div>

      <div className="p-6 sm:p-9">
        <div className="md:hidden">
          <Logo />
        </div>
        <h2 className="mt-6 text-2xl font-semibold tracking-tight md:mt-0">Connexion</h2>
        <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
          Entrez l’email et le mot de passe de votre compte.
        </p>

        <form onSubmit={handleSubmit} className="mt-7 space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="vous@entreprise.tn"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-sm font-medium">
                Mot de passe
              </label>
              <button
                type="button"
                className="text-xs font-medium text-primary hover:underline"
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? "Masquer" : "Afficher"}
              </button>
            </div>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="8 caractères minimum"
            />
          </div>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          <Button type="submit" className="h-11 w-full" disabled={loading}>
            {loading ? "Connexion…" : "Se connecter"}
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          Nouveau sur SmartApply ? <Link href="/register" className="font-medium text-primary hover:underline">Créer un compte</Link>
        </p>
      </div>
    </div>
  );
}
