"use client";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
}

export default function Textarea({ label, id, className = "", ...props }: TextareaProps) {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div>
      {label && (
        <label htmlFor={textareaId} className="mb-1 ml-4 block text-xs font-medium text-gray-400">
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`w-full resize-none rounded-3xl border border-input-border bg-input-bg text-foreground px-5 py-3 text-base transition focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
        {...props}
      />
    </div>
  );
}
