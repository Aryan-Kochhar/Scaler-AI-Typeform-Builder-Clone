"use client";

import { Canvas } from "@/components/builder/Canvas";
import { QuestionSidebar } from "@/components/builder/QuestionSidebar";
import { RightPanel } from "@/components/builder/RightPanel";

export default function CreatePage() {
  return (
    <div className="flex min-h-0 flex-1">
      <QuestionSidebar />
      <Canvas />
      <RightPanel />
    </div>
  );
}
