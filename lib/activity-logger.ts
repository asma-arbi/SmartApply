import { createClient } from "@/lib/supabase/server";

export type ActivityType = 'created' | 'updated' | 'published' | 'closed' | 'reopened' | 'deleted';

export interface ActivityMetadata {
  previous?: Record<string, unknown>;
  current?: Record<string, unknown>;
  changes?: string[];
  statusTransition?: {
    from: string;
    to: string;
  };
}

interface LogActivityParams {
  jobId: string;
  companyId: string;
  actorId: string;
  actionType: ActivityType;
  description: string;
  metadata?: ActivityMetadata;
}

/**
 * Log a job activity to the audit trail
 * This function should be called after successful job mutations
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  const { jobId, companyId, actorId, actionType, description, metadata } = params;

  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('job_activities')
      .insert({
        job_id: jobId,
        company_id: companyId,
        actor_id: actorId,
        action_type: actionType,
        description,
        metadata: metadata || {},
      });

    if (error) {
      console.error('Failed to log activity:', error);
      // Don't throw - activity logging failure shouldn't break the main operation
    }
  } catch (err) {
    console.error('Exception while logging activity:', err);
    // Silent fail - logging is supplementary
  }
}

/**
 * Generate a human-readable description for field changes
 */
export function generateChangeDescription(changes: string[]): string {
  if (changes.length === 0) return 'Aucune modification';
  if (changes.length === 1) return `Champ modifié : ${changes[0]}`;
  if (changes.length === 2) return `Champs modifiés : ${changes.join(' et ')}`;
  
  const lastField = changes[changes.length - 1];
  const otherFields = changes.slice(0, -1).join(', ');
  return `Champs modifiés : ${otherFields} et ${lastField}`;
}

/**
 * Detect changed fields between two job objects
 */
export function detectChanges(
  previous: Record<string, unknown>,
  current: Record<string, unknown>,
  fieldsToTrack: string[] = ['title', 'location', 'type', 'description', 'status']
): string[] {
  const changes: string[] = [];

  for (const field of fieldsToTrack) {
    if (previous[field] !== current[field]) {
      changes.push(field);
    }
  }

  return changes;
}

/**
 * Get friendly field names for display (French)
 */
export function getFriendlyFieldName(field: string): string {
  const fieldNames: Record<string, string> = {
    title: 'titre',
    location: 'localisation',
    type: 'type de contrat',
    description: 'description',
    status: 'statut',
  };

  return fieldNames[field] || field;
}

/**
 * Generate metadata for an update action
 */
export function generateUpdateMetadata(
  previous: Record<string, unknown>,
  current: Record<string, unknown>
): ActivityMetadata {
  const changes = detectChanges(previous, current);
  const friendlyChanges = changes.map(getFriendlyFieldName);

  return {
    previous,
    current,
    changes: friendlyChanges,
  };
}

/**
 * Generate metadata for a status transition
 */
export function generateStatusTransitionMetadata(
  from: string,
  to: string
): ActivityMetadata {
  return {
    statusTransition: { from, to },
  };
}
