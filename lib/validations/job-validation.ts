export type JobFormData = {
  title: string;
  location: string;
  type: string;
  description: string;
  status: "draft" | "published" | "closed";
};

export type ValidationResult = {
  isValid: boolean;
  errors: {
    title?: string;
    location?: string;
    type?: string;
    description?: string;
    general?: string;
  };
};

/**
 * Validate job data before publishing
 * Drafts can be saved with minimal validation
 */
export function validateJobForPublish(data: Partial<JobFormData>): ValidationResult {
  const errors: ValidationResult["errors"] = {};
  
  // Title validation
  if (!data.title || data.title.trim().length === 0) {
    errors.title = "Le titre est requis";
  } else if (data.title.trim().length < 3) {
    errors.title = "Le titre doit contenir au moins 3 caractères";
  } else if (data.title.length > 200) {
    errors.title = "Le titre ne peut pas dépasser 200 caractères";
  }
  
  // Location validation
  if (!data.location || data.location.trim().length === 0) {
    errors.location = "La localisation est requise";
  } else if (data.location.trim().length < 2) {
    errors.location = "La localisation doit contenir au moins 2 caractères";
  }
  
  // Description validation
  if (!data.description || data.description.trim().length === 0) {
    errors.description = "La description est requise";
  } else if (data.description.trim().length < 10) {
    errors.description = `La description doit contenir au moins 10 caractères (actuellement ${data.description.trim().length})`;
  } else if (data.description.length > 5000) {
    errors.description = "La description ne peut pas dépasser 5000 caractères";
  }
  
  // Type validation
  const validTypes = [
    "CDI",
    "CDD", 
    "Stage",
    "Alternance",
    "Freelance",
    "Internship-Private",
    "Internship-School",
    "Project-Contract",
    "Mission-Contract",
    "Obras-Contract",
    "Appel-Contract",
    "CTI",
    "VIE",
    "Other"
  ];
  if (!data.type || !validTypes.includes(data.type)) {
    errors.type = "Type de contrat invalide";
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Validate draft job data (minimal validation)
 */
export function validateJobDraft(data: Partial<JobFormData>): ValidationResult {
  const errors: ValidationResult["errors"] = {};
  
  // Only require title for drafts
  if (!data.title || data.title.trim().length === 0) {
    errors.title = "Le titre est requis même pour un brouillon";
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}

/**
 * Extract job data from FormData
 */
export function extractJobDataFromForm(formData: FormData): Partial<JobFormData> {
  return {
    title: formData.get("title")?.toString() || "",
    location: formData.get("location")?.toString() || "",
    type: formData.get("type")?.toString() || "CDI",
    description: formData.get("description")?.toString() || "",
    status: (formData.get("status")?.toString() as JobFormData["status"]) || "draft",
  };
}
