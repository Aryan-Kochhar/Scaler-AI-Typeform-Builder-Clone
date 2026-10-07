"use client";

import { useParams } from "next/navigation";
import { BuilderHeader } from "@/components/builder/BuilderHeader";
import { FormEditorProvider } from "@/components/builder/FormEditorProvider";

export default function FormLayout({ children }: { children: React.ReactNode }) {
  const { formId } = useParams<{ formId: string }>();
  return (
    <FormEditorProvider formId={formId}>
      <div className="flex h-dvh flex-col bg-canvas">
        <BuilderHeader />
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </FormEditorProvider>
  );
}
