# Conformité CDC — Posts Management + Letter Studio

Sources intégrées dans ce dépôt :
- [`cahier-des-charges.txt`](./cahier-des-charges.txt) (extrait Word)
- [`functional-reference.txt`](./functional-reference.txt) (extrait PDF Functional Reference)

Propriétaire assigné (Functional Reference §12) : **Ahmed Ridha — Posts Management**  
+ ownership **proposée** du letter studio / orchestration email (coord. Yosra pour `applications`).

## Posts [EXTENSION]

| Exigence CDC | Implémentation |
|---|---|
| Annonces entreprise / contenu carrière | `Post` + catégories Prisma |
| Modération / signalements | `PostReport` + `/admin/reports` |
| Likes / comments optionnels | Implémentés (engagement) |
| Lien offre ≠ être une offre | `jobId` optionnel, post ≠ vacancy |
| Source externe visible | `MANUAL` / `IMPORTED` + `sourceUrl` |

## Module D — Letter Studio (proposé)

| Exigence CDC | Implémentation |
|---|---|
| FR / EN | `ContentLanguage` |
| Ancrage anti-invention | `sanitizeLetter` |
| Retry IA 1× puis template | `maybeGenerateWithAi` |
| Template de repli | `renderTemplate` |
| Confirm avant envoi | `confirm: true` obligatoire |
| Quotas journaliers lettres | Free **10**/j · Premium **40**/j |
| Quotas envoi jour / semaine | Free **10**/j **30**/sem · Premium **25**/j **75**/sem |
| Régénérations / candidature | Free **2** · Premium **10** (après 1ère = total 3 / 11) |
| Gmail send-only OAuth | **Démo** : compose Gmail + statut `SENT` (pas OAuth API) |
| Application ownership Yosra | Lecture seule `catalog_applications` |

## Hors scope de ce module

Matching, CV upload, NestJS workers, Stripe, inbox entreprise, PWA offline shell — autres coéquipiers.
