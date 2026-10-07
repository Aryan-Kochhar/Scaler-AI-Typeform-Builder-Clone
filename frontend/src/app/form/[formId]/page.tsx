import { redirect } from "next/navigation";

export default async function FormIndex({ params }: { params: Promise<{ formId: string }> }) {
  const { formId } = await params;
  redirect(`/form/${formId}/create`);
}
