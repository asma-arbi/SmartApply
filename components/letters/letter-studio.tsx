"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Mail, ShieldCheck, Sparkles, Wand2 } from "lucide-react";
import {
  type ApplicationLetter,
  type CandidateProfile,
  type LetterApplication,
  type LetterLanguage,
  type LetterUsage,
} from "@/lib/letters-api";
import {
  generateLetterAction,
  letterUsageAction,
  listLetterApplicationsAction,
  listLettersAction,
  sendLetterAction,
  updateLetterAction,
} from "@/server/actions/letters.actions";
import { useLiveFeed } from "@/hooks/use-live-feed";
import { PageIntro } from "@/components/layout/page-intro";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import Link from "next/link";
import { cn } from "@/lib/utils";

export function LetterStudio() {
  const [applications, setApplications] = useState<LetterApplication[]>([]);
  const [history, setHistory] = useState<ApplicationLetter[]>([]);
  const [profile, setProfile] = useState<CandidateProfile | null>(null);
  const [usage, setUsage] = useState<LetterUsage | null>(null);
  const [applicationId, setApplicationId] = useState("");
  const [language, setLanguage] = useState<LetterLanguage>("FR");
  const [letter, setLetter] = useState<ApplicationLetter | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  const selected = useMemo(
    () => applications.find((item) => item.id === applicationId) ?? null,
    [applications, applicationId],
  );
  const dirty = Boolean(letter && (subject !== letter.subject || body !== letter.body));
  const generateLeft = usage ? Math.max(0, usage.generate.limit - usage.generate.used) : null;
  const sendLeft = usage
    ? Math.max(
        0,
        Math.min(usage.send.limit - usage.send.used, usage.sendWeek.limit - usage.sendWeek.used),
      )
    : null;

  async function loadCatalog(isFirst = false) {
    try {
      const [apps, quota, letters] = await Promise.all([
        listLetterApplicationsAction(),
        letterUsageAction(),
        listLettersAction(),
      ]);
      setApplications(apps.items as unknown as LetterApplication[]);
      setProfile(apps.profile as unknown as CandidateProfile);
      setUsage(quota);
      setHistory(letters.items as unknown as ApplicationLetter[]);
      if (isFirst) {
        const first = apps.items[0];
        if (first) {
          setApplicationId(first.id);
          setLanguage(first.job?.language ?? "FR");
        }
      }
      setError("");
    } catch (err: unknown) {
      if (isFirst) {
        setError(err instanceof Error ? err.message : "Chargement impossible.");
      }
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => void loadCatalog(true), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useLiveFeed(() => {
    void loadCatalog(false);
  }, true);

  async function generate() {
    if (!applicationId) return;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      const result = await generateLetterAction(applicationId, language);
      setLetter(result.letter);
      setSubject(result.letter.subject);
      setBody(result.letter.body);
      setUsage(result.usage);
      setHistory((current) => {
        const without = current.filter((item) => item.id !== result.letter.id);
        return [result.letter, ...without];
      });
      setNotice(
        result.ai
          ? "Lettre générée par IA, à relire avant envoi."
          : "IA indisponible — modèle préécrit utilisé, sans fait inventé.",
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Génération impossible.");
    } finally {
      setLoading(false);
    }
  }

  async function saveEdits() {
    if (!letter) return;
    setSaving(true);
    setError("");
    try {
      const updated = await updateLetterAction(letter.id, { subject, body });
      setLetter(updated);
      setSubject(updated.subject);
      setBody(updated.body);
      setNotice("Brouillon enregistré.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmSend() {
    if (!letter) return;
    setLoading(true);
    setError("");
    try {
      if (subject !== letter.subject || body !== letter.body) {
        await updateLetterAction(letter.id, { subject, body });
      }
      const result = await sendLetterAction(letter.id, true);
      setLetter(result.letter);
      setUsage(result.usage);
      setHistory((current) =>
        current.map((item) => (item.id === result.letter.id ? result.letter : item)),
      );
      setConfirmOpen(false);
      const gmailWindow = window.open(result.gmailUrl, "_blank");
      if (gmailWindow) gmailWindow.opener = null;
      setNotice(gmailWindow
        ? "Gmail est ouvert avec votre candidature. Cliquez sur Envoyer dans Gmail pour terminer."
        : "La fenêtre Gmail a été bloquée. Autorisez les fenêtres contextuelles puis rouvrez votre lettre.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Envoi impossible.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageIntro
        kicker="Studio de candidature"
        title="Lettre personnalisée"
        description="Générez une lettre FR ou EN à partir de votre profil et de l’offre. Aucun fait n’est inventé. L’envoi Gmail demande une confirmation."
      />

      {usage ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuotaCard label="Générations aujourd’hui" used={usage.generate.used} limit={usage.generate.limit} plan={usage.plan} />
          <QuotaCard label="Envois aujourd’hui" used={usage.send.used} limit={usage.send.limit} plan={usage.plan} />
          <QuotaCard label="Envois cette semaine" used={usage.sendWeek.used} limit={usage.sendWeek.limit} plan={usage.plan} />
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Régénérations / candidature</p>
              <span className="text-xs text-muted-foreground">{usage.plan}</span>
            </div>
            <p className="mt-2 text-2xl font-semibold tracking-tight">
              {usage.regenerationsPerApplication}
              <span className="text-sm font-medium text-muted-foreground"> max après 1ʳᵉ</span>
            </p>
            <p className="mt-3 text-xs text-muted-foreground">Free 2 · Premium 10 (CDC §9)</p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <StackColumn>
          <Card>
            <CardContent className="space-y-4 p-5">
              <SectionTitle>Candidature liée</SectionTitle>
              <label className="space-y-1.5">
                <span className="text-xs font-medium text-muted-foreground">Offre et entreprise</span>
                <Select
                  value={applicationId}
                  onChange={(event) => {
                    const next = applications.find((item) => item.id === event.target.value);
                    setApplicationId(event.target.value);
                    if (next?.job?.language) setLanguage(next.job.language);
                    setLetter(null);
                    setSubject("");
                    setBody("");
                    setNotice("");
                  }}
                >
                  {applications.length === 0 ? (
                    <option value="">Aucune offre publiée disponible</option>
                  ) : (
                    applications.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.job?.title ?? "Offre"} — {item.company?.name ?? "Entreprise"}
                        {item.targetType === "JOB" ? " (offre publiée)" : item.status === "PENDING" ? " (en attente)" : item.status === "ACCEPTED" ? " (acceptée)" : item.status === "REJECTED" ? " (refusée)" : item.status === "WITHDRAWN" ? " (retirée)" : ""}
                      </option>
                    ))
                  )}
                </Select>
              </label>

              {selected?.job && selected.company ? (
                <div className="rounded-xl border border-border bg-muted/40 p-4">
                  <p className="text-sm font-semibold">{selected.job.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selected.company.name} · {selected.job.city} · {selected.job.type} ·{" "}
                    {selected.targetType === "JOB" ? "offre publiée · lettre sans dossier de candidature" : selected.status === "PENDING" ? "candidature en attente" : selected.status === "ACCEPTED" ? "candidature acceptée" : selected.status === "REJECTED" ? "candidature refusée" : "candidature retirée"}
                  </p>
                  {selected.company.recruiterEmail ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Destinataire : {selected.company.recruiterEmail}
                    </p>
                  ) : null}
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{selected.job.description}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {selected.job.requirements.map((skill) => (
                      <span key={skill} className="rounded-full bg-card px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-border">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">
                  Langue de la lettre
                  {selected?.job?.language ? ` · offre en ${selected.job.language}` : ""}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLanguage("FR")}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-sm font-medium",
                      language === "FR" ? "border-primary bg-primary/5 text-primary" : "border-border",
                    )}
                  >
                    Français
                  </button>
                  <button
                    type="button"
                    onClick={() => setLanguage("EN")}
                    className={cn(
                      "rounded-xl border px-3 py-2 text-sm font-medium",
                      language === "EN" ? "border-primary bg-primary/5 text-primary" : "border-border",
                    )}
                  >
                    English
                  </button>
                </div>
              </div>

              <Button
                className="h-11 w-full"
                disabled={loading || !applicationId || generateLeft === 0}
                onClick={() => void generate()}
              >
                <Wand2 />
                {loading
                  ? "Rédaction…"
                  : generateLeft === 0
                    ? "Quota de génération atteint"
                    : "Générer la lettre"}
              </Button>
            </CardContent>
          </Card>

          {profile ? (
            <Card>
              <CardContent className="space-y-3 p-5">
                <SectionTitle>Faits du profil — seuls ces éléments sont utilisés</SectionTitle>
                <p className="text-sm font-medium">{profile.fullName}</p>
                <p className="text-xs text-muted-foreground">{profile.headline} · {profile.city}</p>
                <div className="flex flex-wrap gap-1.5">
                  {profile.skills.map((skill) => (
                    <span key={skill} className="rounded-full bg-accent px-2.5 py-0.5 text-[11px] font-medium text-accent-foreground">
                      {skill}
                    </span>
                  ))}
                </div>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {profile.experiences.map((item) => (
                    <li key={`${item.company}-${item.title}`}>
                      {item.title} — {item.company} ({item.years})
                    </li>
                  ))}
                  {profile.education.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </StackColumn>

        <Card className="min-h-[28rem]">
          <CardContent className="space-y-4 p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <SectionTitle>Lettre éditable</SectionTitle>
              {letter ? (
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium">
                  {letter.source === "AI" ? "Source IA" : "Modèle préécrit"} · {letter.status === "GMAIL_OPENED" ? "Gmail ouvert" : letter.status === "SENT" ? "Envoyée" : letter.status === "READY" ? "Prête" : letter.status}
                </span>
              ) : null}
            </div>

            {!letter ? (
              <div className="flex min-h-72 flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 text-center">
                <Sparkles className="size-6 text-primary" />
                <p className="mt-3 text-sm font-medium">Aucune lettre pour le moment</p>
                <p className="mt-1 max-w-sm text-xs leading-5 text-muted-foreground">
                  {applications.length
                    ? "Choisissez une candidature ou une offre publiée, sélectionnez la langue, puis générez. Vous pourrez tout modifier avant l’envoi."
                    : "Aucune offre publiée n’est disponible dans le catalogue pour le moment."}
                </p>
                {applications.length === 0 ? (
                  <Link href="/offres" className="mt-3 text-sm font-medium text-primary hover:underline">
                    Consulter les offres
                  </Link>
                ) : null}
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium" htmlFor="subject">Objet</label>
                    <span className="text-[11px] text-muted-foreground">{subject.trim().length}/180</span>
                  </div>
                  <Input
                    id="subject"
                    maxLength={180}
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder={
                      selected?.job
                        ? `Candidature — ${selected.job.title} — ${profile?.fullName ?? ""}`
                        : "Objet de la lettre"
                    }
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium" htmlFor="body">Lettre</label>
                    <span className="text-[11px] text-muted-foreground">{body.trim().length} caractères</span>
                  </div>
                  <Textarea
                    id="body"
                    value={body}
                    onChange={(event) => setBody(event.target.value)}
                    className="min-h-72 font-[inherit] leading-7"
                    placeholder="La lettre n’utilisera que les faits de votre profil et de l’offre."
                  />
                </div>
                {letter.recipient ? (
                  <p className="text-xs text-muted-foreground">Envoi prévu vers {letter.recipient}</p>
                ) : null}
                {dirty ? <p className="text-xs text-amber-700 dark:text-amber-300">Modifications non enregistrées</p> : null}
                {letter.warnings.length > 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100">
                    {letter.warnings.join(" ")}
                  </div>
                ) : (
                  <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <ShieldCheck className="size-3.5" />
                    Contrôle anti-invention actif
                  </p>
                )}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button variant="outline" disabled={saving || letter.status === "SENT" || !dirty} onClick={() => void saveEdits()}>
                    {saving ? "Enregistrement…" : "Enregistrer"}
                  </Button>
                  <Button
                    disabled={loading || letter.status === "SENT" || !subject.trim() || body.trim().length < 40 || sendLeft === 0}
                    onClick={() => setConfirmOpen(true)}
                  >
                    <Mail />
                    {letter.status === "SENT"
                      ? "Déjà envoyée"
                      : letter.status === "GMAIL_OPENED"
                        ? "Rouvrir dans Gmail"
                      : sendLeft === 0
                        ? "Quota d’envoi atteint"
                        : "Envoyer via Gmail"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {history.length > 0 ? (
        <Card>
          <CardContent className="space-y-3 p-5">
            <SectionTitle>Historique des lettres</SectionTitle>
            <ul className="divide-y divide-border">
              {history.slice(0, 8).map((item) => (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{item.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.company?.name ?? "Entreprise"} · {item.job?.title ?? "Offre"} ·{" "}
                      {item.source === "AI" ? "IA" : "Modèle"} · {item.status}
                      {item.sentAt
                        ? ` · envoyée ${new Date(item.sentAt).toLocaleString("fr-FR")}`
                        : ""}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    className="h-8 px-3 text-xs"
                    onClick={() => {
                      setLetter(item);
                      setSubject(item.subject);
                      setBody(item.body);
                      setApplicationId(item.applicationId ?? item.job?.id ?? "");
                      setLanguage(item.language);
                      setNotice("Lettre rechargée.");
                    }}
                  >
                    Ouvrir
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      {notice ? (
        <p className="rounded-xl border border-primary/20 bg-accent px-4 py-3 text-sm text-accent-foreground">{notice}</p>
      ) : null}
      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent onClose={() => setConfirmOpen(false)}>
          <DialogTitle>Confirmer l’envoi Gmail</DialogTitle>
          <DialogDescription>
            Après confirmation, le quota sera consommé et Gmail s’ouvrira vers {letter?.recipient ?? "le recruteur"} avec l’objet « {subject} ». Vous devrez cliquer sur Envoyer dans Gmail pour terminer l’envoi.
          </DialogDescription>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>Annuler</Button>
            <Button disabled={loading} onClick={() => void confirmSend()}>
              Confirmer et ouvrir Gmail
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return <h2 className="text-sm font-semibold tracking-tight">{children}</h2>;
}

function StackColumn({ children }: { children: ReactNode }) {
  return <div className="space-y-4">{children}</div>;
}

function QuotaCard({
  label,
  used,
  limit,
  plan,
}: {
  label: string;
  used: number;
  limit: number;
  plan: string;
}) {
  const ratio = limit === 0 ? 0 : Math.min(100, Math.round((used / limit) * 100));
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">{label}</p>
        <span className="text-xs text-muted-foreground">{plan}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight">
        {used}
        <span className="text-sm font-medium text-muted-foreground"> / {limit}</span>
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${ratio}%` }} />
      </div>
    </div>
  );
}

