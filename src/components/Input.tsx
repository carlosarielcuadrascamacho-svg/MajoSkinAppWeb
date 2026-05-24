"use client";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export default function Input({ label, id, className = "", ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="mb-1 ml-4 block text-xs font-medium text-gray-400">
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`rounded-full border border-[#E5E5E5] bg-white px-5 py-3 text-base transition placeholder:text-gray-300 focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
        {...props}
      />
    </div>
  );
}
