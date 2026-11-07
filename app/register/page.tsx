import { RegisterForm } from "@/components/auth/register-form";

export default function RegisterPage() {
  return (
    <div className="flex min-h-[calc(100dvh-var(--sa-header-h))] w-full flex-1 items-center justify-center px-4 py-8">
      <RegisterForm />
    </div>
  );
}
