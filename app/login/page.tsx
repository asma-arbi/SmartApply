import Link from "next/link";
import { login } from "@/app/actions";

export default function Login({ searchParams }: { searchParams: { error?: string; msg?: string } }) {
  const input = "w-full border rounded px-3 py-2";
  return (
    <form action={login} className="bg-white border rounded p-6 space-y-3 max-w-sm mx-auto">
      <h1 className="text-xl font-bold">Connexion entreprise</h1>
      {searchParams.msg && <p className="text-green-700 text-sm">Compte créé. Confirmez votre email puis connectez-vous.</p>}
      {searchParams.error && <p className="text-red-600 text-sm">Email ou mot de passe incorrect.</p>}
      <input name="email" type="email" required placeholder="Email" className={input} />
      <input name="password" type="password" required placeholder="Mot de passe" className={input} />
      <button className="w-full bg-blue-600 text-white py-2 rounded">Se connecter</button>
      <p className="text-sm">Pas de compte ? <Link href="/register" className="text-blue-600">Créer un espace entreprise</Link></p>
    </form>
  );
}
