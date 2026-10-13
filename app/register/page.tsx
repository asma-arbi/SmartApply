import { register } from "@/app/actions";

export default function Register({ searchParams }: { searchParams: { error?: string } }) {
  const input = "w-full border rounded px-3 py-2";
  return (
    <form action={register} className="bg-white border rounded p-6 space-y-3 max-w-sm mx-auto">
      <h1 className="text-xl font-bold">Créer un espace entreprise</h1>
      {searchParams.error && <p className="text-red-600 text-sm">{searchParams.error}</p>}
      <input name="name" required placeholder="Nom de l'entreprise" className={input} />
      <input name="email" type="email" required placeholder="Email professionnel" className={input} />
      <input name="password" type="password" required minLength={6} placeholder="Mot de passe (6 min)" className={input} />
      <button className="w-full bg-blue-600 text-white py-2 rounded">Créer mon compte</button>
    </form>
  );
}
