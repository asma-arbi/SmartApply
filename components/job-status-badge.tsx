import { Badge } from "@/components/ui/badge";
import { FileText, Eye, XCircle } from "lucide-react";

type JobStatus = "draft" | "published" | "closed";

interface JobStatusBadgeProps {
  status: JobStatus;
}

const statusConfig = {
  draft: {
    label: "Brouillon",
    variant: "secondary" as const,
    icon: FileText,
  },
  published: {
    label: "Publiée",
    variant: "success" as const,
    icon: Eye,
  },
  closed: {
    label: "Clôturée",
    variant: "destructive" as const,
    icon: XCircle,
  },
};

export function JobStatusBadge({ status }: JobStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="gap-1">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
}
