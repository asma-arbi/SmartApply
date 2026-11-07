const bearer = [{ bearerAuth: [] }];

const errorShape = {
  type: "object",
  required: ["success", "error"],
  properties: {
    success: { type: "boolean", enum: [false] },
    error: {
      type: "object",
      required: ["code", "message"],
      properties: {
        code: { type: "string" },
        message: { type: "string" },
        details: {},
      },
    },
  },
};

export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "SmartApply Tunisia — Posts Management",
    version: "1.0.0",
    description:
      "Company announcements, career advice, recruitment news and internship posts. " +
      "Search, likes, comments, bookmarks, reports and admin moderation. " +
      "Posts may link a job or enterprise but are not vacancies. " +
      "Imported content must expose a visible sourceUrl.",
  },
  servers: [{ url: "/api/v1", description: "Versioned API" }],
  tags: [
    { name: "Posts" },
    { name: "Company" },
    { name: "Engagement" },
    { name: "Admin" },
    { name: "Catalog" },
    { name: "Letters" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
    },
    schemas: {
      Error: errorShape,
      PostCategory: {
        type: "string",
        enum: [
          "COMPANY_ANNOUNCEMENT",
          "JOB_OPENING",
          "INTERNSHIP_ANNOUNCEMENT",
          "PFE_ANNOUNCEMENT",
          "OPEN_DAY",
          "RECRUITMENT_NEWS",
          "CAREER_ADVICE",
          "WORKSHOP",
          "COMPANY_LIFE",
          "TESTIMONIAL",
          "SCHOLARSHIP",
          "CAMPUS_NEWS",
        ],
      },
      PostStatus: { type: "string", enum: ["DRAFT", "PUBLISHED", "ARCHIVED", "REMOVED"] },
      PostSource: { type: "string", enum: ["MANUAL", "IMPORTED"] },
      CreatePost: {
        type: "object",
        required: ["title", "body", "category"],
        properties: {
          title: { type: "string", example: "Test Swagger" },
          body: {
            type: "string",
            example: "Ce post est cree depuis Swagger et va dans MongoDB.",
          },
          category: { $ref: "#/components/schemas/PostCategory" },
          tags: { type: "array", items: { type: "string" }, example: ["swagger"] },
          language: { type: "string", enum: ["FR", "EN"], example: "FR" },
          companyId: { type: "string", format: "uuid" },
          jobId: { type: "string", format: "uuid" },
          jobDetails: {
            type: "object",
            description: "Informations métier structurées pour une publication de type offre.",
            properties: {
              family: { type: "string", example: "Data, IA & analytics" },
              contractType: { type: "string", enum: ["CDI", "CDD", "STAGE", "ALTERNANCE", "FREELANCE", "PFE"] },
              seniority: { type: "string", enum: ["ENTRY", "JUNIOR", "MID", "SENIOR", "LEAD"] },
              workMode: { type: "string", enum: ["ONSITE", "HYBRID", "REMOTE"] },
              location: { type: "string", example: "Tunis" },
              salaryMin: { type: "integer" },
              salaryMax: { type: "integer" },
              currency: { type: "string", enum: ["TND", "EUR"] },
              skills: { type: "array", items: { type: "string" } },
              deadline: { type: "string", format: "date" },
              applicationUrl: { type: "string", format: "uri" },
            },
          },
          publish: { type: "boolean", example: true },
        },
      },
      UpdatePost: {
        type: "object",
        properties: {
          title: { type: "string", example: "Titre modifié" },
          body: { type: "string", example: "Nouveau contenu du post, au moins 20 caracteres." },
          category: { $ref: "#/components/schemas/PostCategory" },
          tags: { type: "array", items: { type: "string" } },
        },
      },
      CreateComment: {
        type: "object",
        required: ["body"],
        properties: {
          body: { type: "string", example: "Commentaire depuis Swagger" },
          parentId: { type: "string", format: "uuid" },
        },
      },
      CreateReport: {
        type: "object",
        required: ["reason"],
        properties: {
          reason: { type: "string", enum: ["SPAM", "ABUSE", "MISINFORMATION", "COPYRIGHT", "OTHER"] },
          details: { type: "string", example: "test" },
        },
      },
      ModeratePost: {
        type: "object",
        required: ["action", "reason"],
        properties: {
          action: { type: "string", enum: ["UNPUBLISH", "REMOVE", "RESTORE", "DISMISS_REPORTS"] },
          reason: { type: "string", example: "Test moderation" },
        },
      },
    },
  },
  paths: {
    "/posts": {
      get: {
        tags: ["Posts"],
        summary: "Search published posts by title, category, company and tags",
        parameters: [
          { name: "q", in: "query", schema: { type: "string" } },
          { name: "category", in: "query", schema: { $ref: "#/components/schemas/PostCategory" } },
          { name: "companyId", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "company", in: "query", schema: { type: "string" }, description: "Nom d'entreprise saisi à la main" },
          { name: "tag", in: "query", schema: { type: "string" } },
          { name: "jobId", in: "query", schema: { type: "string", format: "uuid" } },
          { name: "job", in: "query", schema: { type: "string" }, description: "Titre d'offre saisi à la main" },
          { name: "language", in: "query", schema: { type: "string", enum: ["FR", "EN"] } },
          { name: "source", in: "query", schema: { $ref: "#/components/schemas/PostSource" } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: { "200": { description: "Paginated published posts" } },
      },
      post: {
        tags: ["Posts"],
        security: bearer,
        summary: "Create a post — inserted immediately into the posts table",
        description:
          "companyId is optional. The caller's company is reused or created on the fly. " +
          "Defaults to PUBLISHED so the row is visible on GET /posts right away.",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/CreatePost" } },
          },
        },
        responses: { "201": { description: "Created and persisted" } },
      },
    },
    "/posts/{id}": {
      get: {
        tags: ["Posts"],
        summary: "Get a post (published public; drafts for company members)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Post" }, "404": { description: "Not found" } },
      },
      patch: {
        tags: ["Company"],
        security: bearer,
        summary: "Edit a post",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/UpdatePost" } },
          },
        },
        responses: { "200": { description: "Updated" }, "403": { description: "Forbidden" } },
      },
      delete: {
        tags: ["Company"],
        security: bearer,
        summary: "Delete (draft) or remove (published) a post",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Deleted" } },
      },
    },
    "/posts/{id}/publish": {
      post: {
        tags: ["Company"],
        security: bearer,
        summary: "Publish — company must be claimed and verified",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Published" }, "403": { description: "UNVERIFIED_COMPANY" } },
      },
    },
    "/posts/{id}/archive": {
      post: {
        tags: ["Company"],
        security: bearer,
        summary: "Archive a post",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Archived" } },
      },
    },
    "/posts/{id}/like": {
      post: {
        tags: ["Engagement"],
        security: bearer,
        summary: "Toggle like",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "{ liked, likes }" } },
      },
    },
    "/posts/{id}/bookmark": {
      post: {
        tags: ["Engagement"],
        security: bearer,
        summary: "Toggle bookmark",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "{ bookmarked, bookmarks }" } },
      },
    },
    "/posts/{id}/comments": {
      get: {
        tags: ["Engagement"],
        summary: "List comments",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Comments" } },
      },
      post: {
        tags: ["Engagement"],
        security: bearer,
        summary: "Add a comment or reply",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/CreateComment" } },
          },
        },
        responses: { "201": { description: "Created" } },
      },
    },
    "/posts/{id}/report": {
      post: {
        tags: ["Engagement"],
        security: bearer,
        summary: "Report a published post",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/CreateReport" } },
          },
        },
        responses: { "201": { description: "Report created" }, "409": { description: "Already pending" } },
      },
    },
    "/comments/{id}": {
      patch: {
        tags: ["Engagement"],
        security: bearer,
        summary: "Edit own comment",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Updated" } },
      },
      delete: {
        tags: ["Engagement"],
        security: bearer,
        summary: "Soft-delete a comment (author, company member or admin)",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Deleted" } },
      },
    },
    "/company/posts": {
      get: {
        tags: ["Company"],
        security: bearer,
        summary: "List own company posts (all statuses)",
        responses: { "200": { description: "Company posts" } },
      },
      post: {
        tags: ["Company"],
        security: bearer,
        summary: "Create a post (optional jobId, source MANUAL|IMPORTED)",
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/CreatePost" } },
          },
        },
        responses: { "201": { description: "Created" } },
      },
    },
    "/me/bookmarks": {
      get: {
        tags: ["Engagement"],
        security: bearer,
        summary: "List the current user's bookmarked published posts",
        responses: { "200": { description: "Bookmarks" } },
      },
    },
    "/admin/posts/reports": {
      get: {
        tags: ["Admin"],
        security: bearer,
        summary: "Admin queue of reported posts",
        parameters: [{ name: "status", in: "query", schema: { type: "string", enum: ["PENDING", "DISMISSED", "ACTIONED"] } }],
        responses: { "200": { description: "Reports" }, "403": { description: "Admin only" } },
      },
    },
    "/admin/posts/{id}/moderate": {
      post: {
        tags: ["Admin"],
        security: bearer,
        summary: "UNPUBLISH | REMOVE | RESTORE | DISMISS_REPORTS",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        requestBody: {
          required: true,
          content: {
            "application/json": { schema: { $ref: "#/components/schemas/ModeratePost" } },
          },
        },
        responses: { "200": { description: "Moderated" } },
      },
    },
    "/catalog/companies": {
      get: {
        tags: ["Catalog"],
        summary: "Read-only entreprises (module Enterprise) — démo d'intégration",
        responses: { "200": { description: "Companies + jobs" } },
      },
    },
    "/catalog/jobs": {
      get: {
        tags: ["Catalog"],
        summary: "Read-only offres (module Fares)",
        responses: { "200": { description: "Jobs" } },
      },
    },
    "/letters/applications": {
      get: {
        tags: ["Letters"],
        security: bearer,
        summary: "Candidatures Yosra (snapshot) + profil candidat",
        responses: { "200": { description: "Applications" } },
      },
    },
    "/letters/generate": {
      post: {
        tags: ["Letters"],
        security: bearer,
        summary: "Génère une lettre FR/EN — template si l'IA est indisponible",
        responses: { "201": { description: "Letter" }, "429": { description: "Quota" } },
      },
    },
    "/letters/{id}": {
      patch: {
        tags: ["Letters"],
        security: bearer,
        summary: "Édite le sujet et le corps",
        responses: { "200": { description: "Updated" } },
      },
    },
    "/letters/{id}/send": {
      post: {
        tags: ["Letters"],
        security: bearer,
        summary: "Envoi Gmail — body { confirm: true } obligatoire",
        responses: { "200": { description: "gmailUrl" }, "400": { description: "CONFIRM_REQUIRED" } },
      },
    },
    "/admin/reports/{id}": {
      patch: {
        tags: ["Admin"],
        security: bearer,
        summary: "Review a single report",
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
        responses: { "200": { description: "Reviewed" } },
      },
    },
  },
};

