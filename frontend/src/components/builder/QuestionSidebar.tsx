"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Copy, DoorOpen, Flag, GripVertical, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Menu } from "@/components/ui/Menu";
import type { Question } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AddContentModal, TypeChip } from "./AddContentModal";
import { useFormEditor } from "./FormEditorProvider";

function SortableQuestion({ question, index }: { question: Question; index: number }) {
  const { selected, select, duplicateQuestion, removeQuestion } = useFormEditor();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id });
  const active = selected === question.id;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "group relative flex items-center gap-2 rounded-lg px-2 py-2 text-sm",
        active ? "bg-black/[0.07]" : "hover:bg-black/[0.04]",
        isDragging && "z-10 bg-white shadow-lg ring-1 ring-line",
      )}
      onClick={() => select(question.id)}
      {...attributes}
      {...listeners}
      aria-label={`Question ${index + 1}. Press space to reorder.`}
    >
      <span aria-hidden className="-ml-1 cursor-grab text-ink-faint opacity-0 group-hover:opacity-100">
        <GripVertical size={14} />
      </span>
      <TypeChip type={question.type} number={index + 1} />
      <span className={cn("min-w-0 flex-1 truncate", question.title ? "text-ink" : "text-ink-faint")}>
        {question.title || "..."}
      </span>
      <Menu
        items={[
          { label: "Duplicate", icon: <Copy size={14} />, onSelect: () => duplicateQuestion(question.id) },
          { label: "Delete", icon: <Trash2 size={14} />, danger: true, onSelect: () => removeQuestion(question.id) },
        ]}
        trigger={({ toggle, open }) => (
          <button
            aria-label="Question actions"
            onClick={toggle}
            className={cn("rounded p-0.5 text-ink-soft hover:bg-black/[0.08]", open ? "opacity-100" : "opacity-0 group-hover:opacity-100")}
          >
            <MoreHorizontal size={16} />
          </button>
        )}
      />
    </div>
  );
}

function ScreenItem({ id, icon, label, muted }: { id: "welcome" | "thankyou"; icon: React.ReactNode; label: string; muted?: boolean }) {
  const { selected, select } = useFormEditor();
  return (
    <button
      onClick={() => select(id)}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm",
        selected === id ? "bg-black/[0.07]" : "hover:bg-black/[0.04]",
        muted ? "text-ink-faint" : "text-ink",
      )}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#e8e6e1]">{icon}</span>
      <span className="flex-1 truncate">{label}</span>
      {muted && <span className="text-[11px]">Off</span>}
    </button>
  );
}

export function QuestionSidebar() {
  const { form, addQuestion, moveQuestion } = useFormEditor();
  const [addOpen, setAddOpen] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    if (!over || active.id === over.id) return;
    const from = form.questions.findIndex((q) => q.id === active.id);
    const to = form.questions.findIndex((q) => q.id === over.id);
    if (from >= 0 && to >= 0) moveQuestion(from, to);
  };

  return (
    <aside className="flex w-[220px] shrink-0 flex-col border-r border-line bg-white xl:w-[264px]">
      <div className="p-3">
        <button className="btn-primary w-full" onClick={() => setAddOpen(true)}>
          <Plus size={16} /> Add content
        </button>
      </div>
      <div className="scrollbar-thin flex-1 overflow-y-auto px-2 pb-4">
        <ScreenItem
          id="welcome"
          icon={<DoorOpen size={13} />}
          label="Welcome Screen"
          muted={!form.settings.welcome_screen.enabled}
        />
        <p className="mb-1 mt-3 px-2 text-xs font-medium text-ink-faint">Questions</p>
        {form.questions.length === 0 && (
          <button
            onClick={() => setAddOpen(true)}
            className="w-full rounded-lg border border-dashed border-line px-3 py-6 text-center text-sm text-ink-soft hover:border-ink-faint"
          >
            Your form is empty.
            <br />
            <span className="font-medium text-ink">Add your first question</span>
          </button>
        )}
        <DndContext sensors={sensors} collisionDetection={closestCenter} modifiers={[restrictToVerticalAxis]} onDragEnd={onDragEnd}>
          <SortableContext items={form.questions.map((q) => q.id)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-0.5">
              {form.questions.map((q, i) => (
                <SortableQuestion key={q.id} question={q} index={i} />
              ))}
            </div>
          </SortableContext>
        </DndContext>
        <p className="mb-1 mt-4 px-2 text-xs font-medium text-ink-faint">Endings</p>
        <ScreenItem id="thankyou" icon={<Flag size={13} />} label={form.settings.thank_you_screen.title || "Thank you screen"} />
      </div>
      <AddContentModal open={addOpen} onClose={() => setAddOpen(false)} onPick={addQuestion} />
    </aside>
  );
}
