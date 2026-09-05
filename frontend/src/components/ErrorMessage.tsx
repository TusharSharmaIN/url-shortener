// src/components/ErrorMessage.tsx
export function ErrorMessage({ message }: { message: string }) {
  return (
    <p className="mt-4 rounded-md border border-warn/30 bg-warn-bg px-4 py-3 text-sm text-warn">
      {message}
    </p>
  );
}
