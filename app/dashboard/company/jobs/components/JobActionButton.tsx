"use client";

interface JobActionButtonProps {
  action: (formData: FormData) => Promise<void>;
  label: string;
  variant: "publish" | "close" | "reopen" | "delete";
  title?: string;
}

export default function JobActionButton({
  action,
  label,
  variant,
  title,
}: JobActionButtonProps) {
  const styles = {
    publish:
      "text-xs font-semibold text-emerald-600 hover:text-emerald-700 px-3 py-1.5 rounded-lg border border-emerald-200 hover:bg-emerald-50 transition-all",
    close:
      "text-xs font-semibold text-slate-600 hover:text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-all",
    reopen:
      "text-xs font-semibold text-blue-600 hover:text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-50 transition-all",
    delete:
      "text-xs font-semibold text-red-600 hover:text-red-700 px-3 py-1.5 rounded-lg border border-transparent hover:border-red-200 hover:bg-red-50 transition-all",
  };

  return (
    <form action={action}>
      <button type="submit" className={styles[variant]} title={title}>
        {label}
      </button>
    </form>
  );
}
