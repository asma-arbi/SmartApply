import Link from "next/link";
import { forgotPassword } from "@/app/actions";
import SubmitButton from "@/app/components/SubmitButton";

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: { sent?: string };
}) {
  const sent = searchParams.sent === "1";

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-white font-black">S</span>
          </div>
          <div>
            <p className="text-slate-900 font-bold leading-none">SmartApply</p>
            <p className="text-blue-600 text-xs">Tunisia</p>
          </div>
        </div>

        <div className="card p-8">
          {sent ? (
            /* Success state */
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-5 border border-emerald-100">
                <span className="text-3xl">📩</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 mb-3">Email envoyé !</h1>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">
                Si un compte est associé à cet email, vous recevrez un lien de réinitialisation.
                Vérifiez aussi votre dossier <strong>spam</strong>.
              </p>
              <Link href="/login" className="btn-primary w-full">
                Retour à la connexion
              </Link>
            </div>
          ) : (
            /* Form state */
            <>
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-5 border border-blue-100">
                <span className="text-2xl">🔑</span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">
                Mot de passe oublié ?
              </h1>
              <p className="text-slate-500 text-sm mb-6">
                Saisissez votre email et nous vous enverrons un lien de réinitialisation.
              </p>

              <form action={forgotPassword} className="space-y-4" id="forgot-password-form">
                <div>
                  <label htmlFor="forgot-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                    Adresse email
                  </label>
                  <input
                    id="forgot-email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="vous@exemple.com"
                    className="input-field"
                  />
                </div>
                <SubmitButton
                  id="btn-forgot-submit"
                  loadingText="Envoi en cours…"
                >
                  Envoyer le lien
                </SubmitButton>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-sm text-slate-400 mt-6">
          <Link href="/login" className="hover:text-blue-600 transition-colors">
            ← Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
