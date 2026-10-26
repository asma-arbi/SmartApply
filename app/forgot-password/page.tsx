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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 py-12">
      <div className="w-full max-w-md animate-slide-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center gap-2.5 mb-2 group">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-sm shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <span className="text-white font-black text-lg leading-none">S</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-slate-900 font-bold text-xl tracking-tight">SmartApply</span>
              <span className="text-blue-600 text-sm font-semibold">Tunisia</span>
            </div>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8">
          {sent ? (
            /* Success state */
            <div className="text-center py-2">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4 border border-emerald-100">
                <CheckIcon />
              </div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight mb-2">Email envoyé !</h1>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">
                Si un compte est associé à cette adresse, vous recevrez un lien de réinitialisation sous peu.
                Pensez également à vérifier vos <strong>courriers indésirables (spam)</strong>.
              </p>
              <Link href="/login" className="btn-primary w-full">
                Retour à la connexion
              </Link>
            </div>
          ) : (
            /* Form state */
            <>
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-5 border border-blue-100">
                <KeyIcon />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">
                Mot de passe oublié ?
              </h1>
              <p className="text-slate-500 text-sm mb-6">
                Saisissez votre adresse email et nous vous enverrons un lien de réinitialisation sécurisé.
              </p>

              <form action={forgotPassword} className="space-y-4" id="forgot-password-form">
                <div>
                  <label htmlFor="forgot-email" className="block text-xs font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
                    Adresse email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <MailIcon />
                    </div>
                    <input
                      id="forgot-email"
                      name="email"
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="vous@exemple.com"
                      className="input-field has-left-icon"
                    />
                  </div>
                </div>

                <SubmitButton
                  id="btn-forgot-submit"
                  loadingText="Envoi en cours…"
                  className="btn-primary w-full mt-2"
                >
                  Envoyer le lien de réinitialisation
                </SubmitButton>
              </form>
            </>
          )}

          <div className="pt-6 mt-6 border-t border-slate-100 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-blue-600 font-medium transition-colors"
            >
              <ArrowLeftIcon />
              <span>Retour à la connexion</span>
            </Link>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-xs text-slate-400 mt-6">
          © {new Date().getFullYear()} SmartApply Tunisia. Tous droits réservés.
        </p>
      </div>
    </div>
  );
}

function MailIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function KeyIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="7.5" cy="15.5" r="5.5" />
      <path d="m21 2-9.6 9.6" />
      <path d="m15.5 7.5 3 3L22 7l-3-3" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}
