import Link from "next/link";
import { login } from "@/app/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Briefcase, LogIn } from "lucide-react";

export default function Login({ searchParams }: { searchParams: { error?: string; msg?: string } }) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        {/* Logo/Brand */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-primary/70 rounded-2xl shadow-lg shadow-primary/25">
            <Briefcase className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Bienvenue sur SmartApply
          </h1>
          <p className="text-muted-foreground">
            Connectez-vous à votre espace entreprise
          </p>
        </div>

        {/* Login Card */}
        <Card className="shadow-xl border-2">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Connexion</CardTitle>
            <CardDescription>
              Accédez à votre tableau de bord
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={login} className="space-y-5">
              {searchParams.msg && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-green-700 text-sm">
                    ✓ Compte créé. Confirmez votre email puis connectez-vous.
                  </p>
                </div>
              )}
              {searchParams.error && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-destructive text-sm">
                    ✗ Email ou mot de passe incorrect.
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="votre@email.com"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••"
                  className="h-11"
                />
              </div>

              <Button type="submit" className="w-full h-11 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
                <LogIn className="h-4 w-4 mr-2" />
                Se connecter
              </Button>

              <div className="text-center pt-2">
                <p className="text-sm text-muted-foreground">
                  Pas de compte ?{" "}
                  <Link href="/register" className="text-primary font-medium hover:underline">
                    Créer un espace entreprise
                  </Link>
                </p>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
