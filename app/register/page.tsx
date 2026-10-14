import Link from "next/link";
import { register } from "@/app/actions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Briefcase, UserPlus } from "lucide-react";

export default function Register({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <div className="min-h-[80vh] flex items-center justify-center">
      <div className="w-full max-w-md space-y-8">
        {/* Logo/Brand */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-primary to-primary/70 rounded-2xl shadow-lg shadow-primary/25">
            <Briefcase className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Rejoignez SmartApply
          </h1>
          <p className="text-muted-foreground">
            Créez votre espace entreprise et recrutez les meilleurs talents
          </p>
        </div>

        {/* Register Card */}
        <Card className="shadow-xl border-2">
          <CardHeader className="space-y-2">
            <CardTitle className="text-2xl">Inscription</CardTitle>
            <CardDescription>
              Créez votre compte entreprise gratuitement
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={register} className="space-y-5">
              {searchParams.error && (
                <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <p className="text-destructive text-sm">✗ {searchParams.error}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Nom de l&apos;entreprise</Label>
                <Input
                  id="name"
                  name="name"
                  required
                  placeholder="Ex: Tech Innovations"
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email professionnel</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="contact@entreprise.com"
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
                  minLength={6}
                  placeholder="Minimum 6 caractères"
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">
                  Au moins 6 caractères
                </p>
              </div>

              <Button type="submit" className="w-full h-11 shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all">
                <UserPlus className="h-4 w-4 mr-2" />
                Créer mon compte
              </Button>

              <div className="text-center pt-2">
                <p className="text-sm text-muted-foreground">
                  Déjà un compte ?{" "}
                  <Link href="/login" className="text-primary font-medium hover:underline">
                    Se connecter
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
