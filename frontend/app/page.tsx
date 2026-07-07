// Home route ("/") — Company Creation screen (FE-5/6/7).
//
// This is a Server Component shell around the interactive form; all
// state/interactivity lives in CompanyCreationForm ("use client").

import { CompanyCreationForm } from "@/components/company-creation/CompanyCreationForm";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-zinc-50 font-sans dark:bg-black">
      <CompanyCreationForm />
    </div>
  );
}
