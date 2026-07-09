// Home route ("/") — Company Creation + (when configured) cloud saves.
//
// Server Component shell around interactive client pieces. The auth/cloud
// components render nothing when Supabase isn't configured, so local-only mode
// looks exactly as before (plus a theme toggle).

import { CompanyCreationForm } from "@/components/company-creation/CompanyCreationForm";
import AuthButton from "@/components/auth/AuthButton";
import CloudSavesList from "@/components/auth/CloudSavesList";
import ThemeToggle from "@/components/ui/ThemeToggle";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center">
      <div className="flex w-full max-w-2xl items-center justify-end gap-2 px-6 pt-4">
        <ThemeToggle />
        <AuthButton />
      </div>
      <div className="w-full max-w-2xl px-6 pt-4">
        <CloudSavesList />
      </div>
      <CompanyCreationForm />
    </div>
  );
}
