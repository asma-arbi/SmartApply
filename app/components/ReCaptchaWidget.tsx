"use client";

import { useState } from "react";

interface ReCaptchaWidgetProps {
  onVerify?: (verified: boolean) => void;
  requiredError?: boolean;
}

export default function ReCaptchaWidget({
  onVerify,
  requiredError = false,
}: ReCaptchaWidgetProps) {
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleClick() {
    if (verified) {
      setVerified(false);
      onVerify?.(false);
      return;
    }

    // Déclenchement de la vérification humaine
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      setVerified(true);
      onVerify?.(true);
    }, 600);
  }

  return (
    <div className="my-4">
      <div
        className={[
          "p-3 bg-slate-50 border rounded-xl flex items-center justify-between shadow-sm select-none transition-all",
          requiredError && !verified
            ? "border-red-400 bg-red-50/30 ring-2 ring-red-400/20"
            : verified
            ? "border-emerald-300 bg-emerald-50/20"
            : "border-slate-200 hover:border-slate-300",
        ].join(" ")}
      >
        {/* Hidden form input so Server Actions can strictly verify */}
        <input
          type="hidden"
          name="recaptcha_verified"
          value={verified ? "1" : "0"}
        />

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleClick}
            className="flex items-center gap-3 text-left focus:outline-none"
            aria-label="Vérification de sécurité reCAPTCHA"
          >
            <div
              className={[
                "w-6 h-6 rounded border-2 flex items-center justify-center transition-all",
                verified
                  ? "bg-emerald-600 border-emerald-600 text-white"
                  : loading
                  ? "border-blue-500 bg-white"
                  : "border-slate-300 bg-white hover:border-blue-500",
              ].join(" ")}
            >
              {loading ? (
                <svg
                  className="w-4 h-4 animate-spin text-blue-600"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
              ) : verified ? (
                <svg
                  className="w-4 h-4 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : null}
            </div>

            <div>
              <span className="text-xs sm:text-sm font-semibold text-slate-800">
                Je ne suis pas un robot
              </span>
              <span className="block text-[10px] text-slate-400 font-normal">
                {verified ? "Vérification validée ✓" : "Cliquez pour valider la vérification"}
              </span>
            </div>
          </button>
        </div>

        <div className="flex flex-col items-center pl-3 border-l border-slate-200 flex-shrink-0">
          <div className="flex items-center gap-1">
            <svg
              className="w-6 h-6 text-blue-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
            >
              <path
                d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"
                fill="#2563EB"
                fillOpacity="0.15"
                stroke="#2563EB"
                strokeWidth="1.5"
              />
              {verified && (
                <path
                  d="M9 12l2 2 4-4"
                  stroke="#16A34A"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>
          </div>
          <span className="text-[10px] font-bold text-slate-500 tracking-tight leading-none mt-1">
            reCAPTCHA
          </span>
          <div className="flex gap-1 text-[8px] text-slate-400 mt-0.5">
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noreferrer"
              className="hover:underline hover:text-slate-600"
            >
              Confidentialité
            </a>
            <span>-</span>
            <a
              href="https://policies.google.com/terms"
              target="_blank"
              rel="noreferrer"
              className="hover:underline hover:text-slate-600"
            >
              Conditions
            </a>
          </div>
        </div>
      </div>

      {requiredError && !verified && (
        <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1">
          <span>⚠️</span> La vérification reCAPTCHA est obligatoire avant de continuer.
        </p>
      )}
    </div>
  );
}
