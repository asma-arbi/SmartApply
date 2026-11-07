import os
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, HRFlowable, KeepTogether
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))

        # Ne pas dessiner d'en-tête/pied-de-page sur la page de couverture
        if self._pageNumber > 1:
            # Header
            self.drawString(1.8 * cm, 28.5 * cm, "SmartApply Tunisia — Guide de Soutenance & Architecture PWA")
            self.setStrokeColor(colors.HexColor("#E2E8F0"))
            self.setLineWidth(0.5)
            self.line(1.8 * cm, 28.3 * cm, 19.2 * cm, 28.3 * cm)

            # Footer
            self.line(1.8 * cm, 1.5 * cm, 19.2 * cm, 1.5 * cm)
            self.drawString(1.8 * cm, 1.1 * cm, "Projet PWA Next.js 14 & Supabase — Confidentialité Académique")
            page_text = f"Page {self._pageNumber} sur {page_count}"
            self.drawRightString(19.2 * cm, 1.1 * cm, page_text)

        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=1.8 * cm,
        rightMargin=1.8 * cm,
        topMargin=2.0 * cm,
        bottomMargin=2.0 * cm
    )

    styles = getSampleStyleSheet()

    # Couleurs de la charte SmartApply
    c_primary = colors.HexColor("#2563EB")   # Bleu Royal
    c_dark = colors.HexColor("#0F172A")      # Slate 900
    c_slate = colors.HexColor("#334155")     # Slate 700
    c_muted = colors.HexColor("#64748B")     # Slate 500
    c_bg_light = colors.HexColor("#F8FAFC")  # Slate 50
    c_border = colors.HexColor("#E2E8F0")    # Border Slate
    c_emerald = colors.HexColor("#059669")   # Vert Succès
    c_amber = colors.HexColor("#D97706")     # Ambre Alerte

    # Styles Typographiques
    title_cover = ParagraphStyle(
        'CoverTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=30,
        textColor=c_dark,
        alignment=0
    )
    subtitle_cover = ParagraphStyle(
        'CoverSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=c_primary,
        alignment=0
    )
    h1_style = ParagraphStyle(
        'H1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=15,
        leading=19,
        textColor=c_dark,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )
    h2_style = ParagraphStyle(
        'H2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=c_primary,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )
    body = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=c_slate,
        spaceAfter=5
    )
    body_bold = ParagraphStyle(
        'BodyBold',
        parent=body,
        fontName='Helvetica-Bold'
    )
    qa_q = ParagraphStyle(
        'QA_Q',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13.5,
        textColor=c_primary,
        spaceBefore=7,
        spaceAfter=2,
        keepWithNext=True
    )
    qa_a = ParagraphStyle(
        'QA_A',
        parent=body,
        fontSize=8.5,
        leading=12.5,
        textColor=c_slate,
        spaceAfter=7
    )
    code_inline = ParagraphStyle(
        'CodeInline',
        parent=body,
        fontName='Courier',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#1E293B")
    )

    story = []

    # ═══════════════════════════════════════════════════════════
    # PAGE 1 : EN-TÊTE & SYNTHÈSE EXÉCUTIVE
    # ═══════════════════════════════════════════════════════════
    badge = Table(
        [[Paragraph("<b>PROJET PWA & ARCHITECTURE WEB AVANCÉE</b>", ParagraphStyle('B', fontName='Helvetica-Bold', fontSize=8, textColor=c_primary))]],
        colWidths=[17.4 * cm],
        style=[
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#EFF6FF")),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#BFDBFE")),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
        ]
    )
    story.append(badge)
    story.append(Spacer(1, 10))

    story.append(Paragraph("SmartApply Tunisia — Fiche Mémo Soutenance", title_cover))
    story.append(Paragraph("Guide complet : Architecture PWA, Gestion des Rôles, Workflow & Stack Technique", subtitle_cover))
    story.append(Spacer(1, 8))
    story.append(HRFlowable(width="100%", thickness=1.5, color=c_primary, spaceBefore=2, spaceAfter=12))

    story.append(Paragraph("1. Fiche d'Identité & Objectifs du Projet", h1_style))
    summary_text = (
        "<b>SmartApply Tunisia</b> est une application web moderne conçue comme une <b>Progressive Web App (PWA)</b> "
        "dédiée au recrutement IT en Tunisie (stages PFE, premier emploi, opportunités tech). "
        "Elle relie trois acteurs clés : les <b>Candidats</b> (chercheurs d'emploi/étudiants), les <b>Entreprises</b> "
        "(recruteurs partenaires) et les <b>Super Administrateurs</b> qui supervisent l'écosystème avec validation des structures."
    )
    story.append(Paragraph(summary_text, body))
    story.append(Spacer(1, 6))

    # Tableau des Spécifications Techniques
    spec_data = [
        [Paragraph("<b>Composant</b>", body_bold), Paragraph("<b>Choix Technologique</b>", body_bold), Paragraph("<b>Justification Technique</b>", body_bold)],
        [Paragraph("Framework Frontend", body), Paragraph("Next.js 14 (App Router) + React 18", body), Paragraph("Server Components (RSC) pour le SEO, performances et rendu hybride.", body)],
        [Paragraph("Langage", body), Paragraph("TypeScript 5", body), Paragraph("Typage statique strict réduisant les erreurs d'exécution à zéro.", body)],
        [Paragraph("Design & UI", body), Paragraph("Tailwind CSS", body), Paragraph("Design System moderne SaaS, mobile-first et utilitaires responsives légers.", body)],
        [Paragraph("Backend & BDD", body), Paragraph("Supabase (PostgreSQL 15 Cloud)", body), Paragraph("Base relationnelle robuste avec Row Level Security (RLS) et Auth JWT.", body)],
        [Paragraph("Gestion de Session", body), Paragraph("@supabase/ssr + Cookies chiffrés", body), Paragraph("Authentification sécurisée compatible SSR et Edge Middleware.", body)],
        [Paragraph("Architecture PWA", body), Paragraph("Service Worker + Web App Manifest", body), Paragraph("Mode hors ligne, mise en cache et installation native sur OS/mobile.", body)],
    ]
    t_specs = Table(spec_data, colWidths=[3.5 * cm, 5.0 * cm, 8.9 * cm])
    t_specs.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F1F5F9")),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_specs)
    story.append(Spacer(1, 14))

    # ═══════════════════════════════════════════════════════════
    # 2. PRINCIPE DE LA PWA & MODE HORS LIGNE
    # ═══════════════════════════════════════════════════════════
    story.append(Paragraph("2. Le Principe de la Progressive Web App (PWA)", h1_style))
    pwa_intro = (
        "Une <b>PWA</b> est une application web qui exploite les standards modernes du navigateur "
        "pour offrir une expérience utilisateur identique à une application mobile native (fluidité, installation, "
        "fonctionnement sans connexion Internet), tout en restant accessible via une simple URL."
    )
    story.append(Paragraph(pwa_intro, body))

    pwa_points = [
        [
            Paragraph("<b>1. Web App Manifest (manifest.json)</b>", h2_style),
            Paragraph(
                "Fichier JSON déclarant les métadonnées de l'application : nom officiel, couleurs de thème "
                "(<font color='#2563EB'>#2563EB</font>), icônes standardisées (192x192 et 512x512) avec "
                "propriété <i>any maskable</i>, et affichage en mode <b>standalone</b> (lancement en plein écran sans barre d'adresse navigateur).",
                body
            )
        ],
        [
            Paragraph("<b>2. Service Worker (sw.js)</b>", h2_style),
            Paragraph(
                "Script JavaScript exécuté en arrière-plan par le navigateur sur un thread séparé. "
                "Il agit comme un <b>proxy réseau côté client</b> : il intercepte chaque requête sortante (`fetch`), "
                "consulte le cache local (`Cache Storage`) et décide d'interroger le réseau ou de renvoyer le cache.",
                body
            )
        ],
        [
            Paragraph("<b>3. Mode Hors Ligne (Offline)</b>", h2_style),
            Paragraph(
                "• <b>Stratégie Cache First :</b> Appliquée aux assets critiques (CSS, JS, icônes) pour un chargement instantané.<br/>"
                "• <b>Stratégie Network First avec Fallback :</b> Pour les pages HTML. Si le réseau est indisponible, "
                "le Service Worker sert la page mise en cache ou bascule automatiquement sur la page dédiée <b>offline.html</b>.<br/>"
                "• <b>Indicateur dynamique :</b> Le composant <code>OfflineIndicator.tsx</code> surveille <code>window.onLine</code> "
                "et informe l'utilisateur en temps réel de la perte ou du rétablissement de la connexion.",
                body
            )
        ],
        [
            Paragraph("<b>4. Ergonomie Mobile-First & Responsive</b>", h2_style),
            Paragraph(
                "Interface pensée prioritairement pour smartphone : balise viewport adaptée, sidebar rétractable en drawer "
                "avec fond flouté, zones tactiles de minimum 44px, et grilles Tailwind fluides (1 col mobile ➔ 4 cols desktop).",
                body
            )
        ]
    ]

    for item in pwa_points:
        story.append(item[0])
        story.append(item[1])
        story.append(Spacer(1, 4))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════
    # PAGE 2 : GESTION DES RÔLES & WORKFLOW
    # ═══════════════════════════════════════════════════════════
    story.append(Paragraph("3. Gestion des Rôles (RBAC) & Sécurité", h1_style))
    rbac_intro = (
        "SmartApply implémente un contrôle d'accès basé sur les rôles (<b>Role-Based Access Control - RBAC</b>). "
        "L'authentification est découplée en deux couches : l'identité dans <code>auth.users</code> et le profil applicatif "
        "dans la table <code>public.profiles</code>."
    )
    story.append(Paragraph(rbac_intro, body))

    roles_data = [
        [Paragraph("<b>Rôle</b>", body_bold), Paragraph("<b>Accès & Dashboard</b>", body_bold), Paragraph("<b>Responsabilités & Fonctionnalités</b>", body_bold)],
        [
            Paragraph("<b>Candidat</b><br/><font color='#2563EB'>[Étudiant / Diplômé]</font>", body),
            Paragraph("<code>/dashboard/candidate</code>", code_inline),
            Paragraph("Inscription publique directe. Consultation des offres publiées, accès à l'annuaire des entreprises vérifiées, suivi des candidatures et paramètres de profil.", body)
        ],
        [
            Paragraph("<b>Entreprise</b><br/><font color='#4F46E5'>[Recruteur partenaire]</font>", body),
            Paragraph("<code>/dashboard/company</code>", code_inline),
            Paragraph("Inscription avec nom de société. Statut initial <b>pending</b> (en attente). Publication d'offres (CDI, Stage PFE, CDD), modification et suppression de ses offres, édition de la fiche société.", body)
        ],
        [
            Paragraph("<b>Super Admin</b><br/><font color='#D97706'>[Superviseur]</font>", body),
            Paragraph("<code>/dashboard/admin</code>", code_inline),
            Paragraph("Compte unique protégé (non disponible à l'inscription publique). Tour de contrôle globale : modération des entreprises (Valider/Rejeter), supervision et suppression des utilisateurs/candidats, gestion des offres et rapports.", body)
        ],
    ]
    t_roles = Table(roles_data, colWidths=[3.5 * cm, 4.3 * cm, 9.6 * cm])
    t_roles.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#F1F5F9")),
        ('GRID', (0,0), (-1,-1), 0.5, c_border),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(t_roles)
    story.append(Spacer(1, 12))

    story.append(Paragraph("4. Architecture & Workflow Utilisateur", h1_style))

    wf_steps = [
        "<b>1. Inscription :</b> L'utilisateur choisit son rôle (Candidat ou Entreprise). Le Server Action <code>register()</code> "
        "enregistre le compte dans Supabase <code>auth.users</code>, insère le profil dans <code>public.profiles</code> avec son nom et email, "
        "puis ouvre immédiatement une session sans bloquer l'utilisateur.",

        "<b>2. Protection par Middleware (<code>middleware.ts</code>) :</b> À chaque requête de navigation vers <code>/dashboard/*</code>, "
        "le middleware Edge intercepte la demande, lit la session chiffrée, extrait le rôle de l'utilisateur et bloque tout accès illégitime "
        "(ex. un candidat tentant d'accéder à <code>/dashboard/admin</code> est redirigé vers <code>/access-denied</code>). Le Super Admin a accès à toutes les zones.",

        "<b>3. Modération Entreprise :</b> Lorsqu'une entreprise s'inscrit, elle apparaît dans l'espace modération de l'Administrateur "
        "avec un badge jaune <i>En attente</i>. L'administrateur peut en un clic valider (statut <code>verified</code>) ou rejeter le dossier.",

        "<b>4. Affichage Intelligent des Candidats :</b> La page <code>/dashboard/admin/users</code> applique une pagination côté serveur "
        "(via <code>range(from, to)</code>) pour garantir une vitesse instantanée même en cas de plusieurs milliers de candidats inscrits."
    ]

    for step in wf_steps:
        box = Table([[Paragraph(step, body)]], colWidths=[17.4 * cm])
        box.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), c_bg_light),
            ('BOX', (0,0), (-1,-1), 0.5, c_border),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
            ('TOPPADDING', (0,0), (-1,-1), 4),
            ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ]))
        story.append(box)
        story.append(Spacer(1, 4))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════
    # PAGE 3 : QUESTIONS TYPIQUES DU PROFESSEUR (FAQ ORALE)
    # ═══════════════════════════════════════════════════════════
    story.append(Paragraph("5. Questions Fréquentes du Jury & Réponses Idéales", h1_style))
    story.append(Paragraph("Anticipez les questions techniques de votre enseignant avec ces réponses synthétiques :", body))
    story.append(Spacer(1, 4))

    faq = [
        (
            "Q1 : Qu'est-ce qui prouve concrètement que votre application est une PWA ?",
            "<b>Réponse :</b> Trois preuves techniques indiscutables :<br/>"
            "1. La présence du fichier <code>manifest.json</code> avec ses icônes 192x192 et 512x512 permettant l'installation via le bouton d'installation du navigateur.<br/>"
            "2. L'enregistrement actif d'un <code>Service Worker</code> vérifiable dans l'onglet <i>Application</i> des DevTools Chrome.<br/>"
            "3. Le fonctionnement en mode déconnecté grâce au Cache Storage et la page de secours <code>offline.html</code>."
        ),
        (
            "Q2 : Pourquoi avoir utilisé Next.js 14 plutôt qu'un React classique (CRA/Vite) ?",
            "<b>Réponse :</b> Next.js 14 apporte le rendu hybride (Server Components), un routage basé sur les dossiers (App Router), "
            "une sécurité accrue avec les <b>Server Actions</b> (le code sensible et les clés d'API ne transitent jamais sur le client), "
            "et un meilleur référencement (SEO) indispensable pour une plateforme d'emploi."
        ),
        (
            "Q3 : Comment garantissez-vous la sécurité des données entre les rôles ?",
            "<b>Réponse :</b> Nous appliquons une sécurité à double niveau :<br/>"
            "• Au niveau de l'application : Le <code>middleware.ts</code> filtre les routes selon le rôle authentifié par token JWT.<br/>"
            "• Au niveau de la base de données : Supabase applique les <b>Row Level Security (RLS)</b>. Même en cas de requête directe sur la base, "
            "un utilisateur ne peut manipuler que ses propres données, tandis que l'administrateur dispose de droits de supervision étendus."
        ),
        (
            "Q4 : Quelle stratégie de mise en cache avez-vous adoptée dans le Service Worker ?",
            "<b>Réponse :</b> Une stratégie hybride :<br/>"
            "• <b>Cache First :</b> Pour les ressources statiques immuables (images, polices, styles) afin d'accélérer l'affichage.<br/>"
            "• <b>Network First :</b> Pour les pages de navigation dynamique (offres, profil) afin de toujours afficher les données fraîches "
            "lorsque le réseau est présent, avec basculement automatique sur le cache ou <code>offline.html</code> en cas de déconnexion."
        ),
        (
            "Q5 : Comment la base de données sépare-t-elle les candidats et les entreprises ?",
            "<b>Réponse :</b> Tous les utilisateurs possèdent un identifiant unique (UUID) dans <code>auth.users</code>. "
            "La table <code>public.profiles</code> stocke leur rôle (<code>candidat</code>, <code>entreprise</code>, <code>admin</code>). "
            "Lorsqu'un compte entreprise est créé, une ligne correspondante est insérée dans la table <code>public.companies</code> "
            "avec un statut <code>pending</code> jusqu'à sa validation par l'administrateur."
        ),
        (
            "Q6 : Comment le responsive design a-t-il été testé et mis en place ?",
            "<b>Réponse :</b> Grâce à l'approche <b>Mobile-First</b> de Tailwind CSS : la disposition par défaut cible les téléphones portables "
            "(sidebar en tiroir coulissant, tableaux défilants horizontalement), puis s'enrichit progressivement via les breakpoints <code>sm:</code>, "
            "<code>md:</code> et <code>lg:</code> sur ordinateur."
        )
    ]

    for q, a in faq:
        story.append(Paragraph(q, qa_q))
        story.append(Paragraph(a, qa_a))

    story.append(Spacer(1, 6))
    box_conseil = Table(
        [[Paragraph("<b>💡 Conseil pour votre présentation orale :</b> Montrez d'abord la création d'un compte Candidat, puis montrez l'espace Super Admin avec la modération des entreprises, et terminez en coupant la connexion dans l'onglet <i>Network</i> pour prouver la PWA en direct !", ParagraphStyle('C', fontName='Helvetica', fontSize=8, textColor=colors.HexColor("#065F46")))]],
        colWidths=[17.4 * cm],
        style=[
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#ECFDF5")),
            ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#A7F3D0")),
            ('TOPPADDING', (0,0), (-1,-1), 6),
            ('BOTTOMPADDING', (0,0), (-1,-1), 6),
            ('LEFTPADDING', (0,0), (-1,-1), 8),
            ('RIGHTPADDING', (0,0), (-1,-1), 8),
        ]
    )
    story.append(box_conseil)

    # Construction du document PDF
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF généré avec succès : {filename}")

if __name__ == "__main__":
    out_path_project = "Guide_Soutenance_SmartApply.pdf"
    out_path_public = os.path.join("public", "Guide_Soutenance_SmartApply.pdf")
    build_pdf(out_path_project)
    build_pdf(out_path_public)
