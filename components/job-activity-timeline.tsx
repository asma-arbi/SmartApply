"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  PlusCircle, 
  Edit, 
  Eye, 
  XCircle, 
  RefreshCw, 
  Trash2,
  Clock,
  Building2
} from "lucide-react";

interface Activity {
  id: string;
  action_type: 'created' | 'updated' | 'published' | 'closed' | 'reopened' | 'deleted';
  description: string;
  created_at: string;
  metadata?: {
    changes?: string[];
    statusTransition?: {
      from: string;
      to: string;
    };
    previous?: Record<string, unknown>;
    current?: Record<string, unknown>;
  };
  companies?: {
    name: string;
  } | null;
}

interface JobActivityTimelineProps {
  activities: Activity[];
  isLoading?: boolean;
  error?: string | null;
}

const activityConfig = {
  created: {
    icon: PlusCircle,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    label: 'Création',
  },
  updated: {
    icon: Edit,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    label: 'Modification',
  },
  published: {
    icon: Eye,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Publication',
  },
  closed: {
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    label: 'Clôture',
  },
  reopened: {
    icon: RefreshCw,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    label: 'Réouverture',
  },
  deleted: {
    icon: Trash2,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    label: 'Suppression',
  },
};

const statusLabels: Record<string, string> = {
  draft: 'Brouillon',
  published: 'Publiée',
  closed: 'Clôturée',
};

export function JobActivityTimeline({ activities, isLoading = false, error = null }: JobActivityTimelineProps) {
  if (isLoading) {
    return <TimelineSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            Historique des activités
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">Erreur lors du chargement de l&apos;historique</p>
            <p className="text-xs mt-1">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            Historique des activités
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm">Aucune activité enregistrée</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5" />
          Historique des activités
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-6">
            {activities.map((activity, index) => {
              const config = activityConfig[activity.action_type];
              const Icon = config.icon;
              const isLast = index === activities.length - 1;

              return (
                <div key={activity.id} className="relative flex gap-4">
                  {/* Icon */}
                  <div className={`relative z-10 flex items-center justify-center w-12 h-12 rounded-full ${config.bgColor} flex-shrink-0`}>
                    <Icon className={`h-5 w-5 ${config.color}`} />
                  </div>

                  {/* Content */}
                  <div className={`flex-1 ${!isLast ? 'pb-6' : ''}`}>
                    <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{activity.description}</p>
                          
                          {/* Actor */}
                          {activity.companies?.name && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Building2 className="h-3 w-3" />
                              Par : {activity.companies.name}
                            </p>
                          )}
                        </div>

                        {/* Action badge */}
                        <span className="text-xs font-medium px-2 py-1 rounded bg-background text-muted-foreground whitespace-nowrap">
                          {config.label}
                        </span>
                      </div>

                      {/* Metadata */}
                      {activity.metadata && (
                        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border">
                          {/* Status transition */}
                          {activity.metadata.statusTransition && (
                            <p>
                              Statut : <span className="font-medium">{statusLabels[activity.metadata.statusTransition.from] || activity.metadata.statusTransition.from}</span>
                              {' → '}
                              <span className="font-medium">{statusLabels[activity.metadata.statusTransition.to] || activity.metadata.statusTransition.to}</span>
                            </p>
                          )}

                          {/* Changed fields */}
                          {activity.metadata.changes && activity.metadata.changes.length > 0 && (
                            <p>
                              Modifications : <span className="font-medium">{activity.metadata.changes.join(', ')}</span>
                            </p>
                          )}
                        </div>
                      )}

                      {/* Timestamp */}
                      <p className="text-xs text-muted-foreground flex items-center gap-1 pt-1">
                        <Clock className="h-3 w-3" />
                        {new Date(activity.created_at).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TimelineSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5" />
          Historique des activités
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="w-12 h-12 rounded-full flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
