"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/use-auth";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function RegisterForm() {
  const router = useRouter();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await register({ name, email, password });
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Inscription impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-[0_16px_40px_rgba(15,23,42,0.08)] sm:p-9">
      <Logo />
      <h1 className="mt-7 text-2xl font-semibold tracking-tight">Créer un compte</h1>
      <p className="mt-1.5 text-sm leading-6 text-muted-foreground">Créez votre compte pour rejoindre la communauté SmartApply.</p>
      <form onSubmit={handleSubmit} className="mt-7 space-y-4">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">Nom</label>
          <Input id="name" autoComplete="name" required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} />
        </div>
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">Email</label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">Mot de passe</label>
          <Input id="password" type="password" autoComplete="new-password" required minLength={8} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="h-11 w-full" disabled={loading}>
          {loading ? "Création…" : "Créer mon compte"}
        </Button>
      </form>
      <p className="mt-5 text-center text-sm text-muted-foreground">
        Déjà inscrit ? <Link href="/login" className="font-medium text-primary hover:underline">Se connecter</Link>
      </p>
    </div>
  );
}
