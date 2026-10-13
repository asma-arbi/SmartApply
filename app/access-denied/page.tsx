import Link from "next/link";

export default function AccessDeniedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md text-center animate-slide-up">
        {/* Icon */}
        <div className="w-24 h-24 bg-red-50 border border-red-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <span className="text-5xl">🚫</span>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-3">Accès refusé</h1>
        <p className="text-slate-500 text-sm leading-relaxed mb-8">
          Vous n&apos;avez pas les autorisations nécessaires pour accéder à cette page.
          <br />
          Vérifiez que vous êtes connecté avec le bon compte.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="btn-secondary px-6">
            ← Accueil
          </Link>
          <Link href="/login" className="btn-primary px-6">
            Se connecter
          </Link>
        </div>

        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mt-10">
          <div className="w-7 h-7 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-black text-xs">S</span>
          </div>
          <span className="text-slate-400 text-sm">SmartApply Tunisia</span>
        </div>
      </div>
    </div>
  );
}
