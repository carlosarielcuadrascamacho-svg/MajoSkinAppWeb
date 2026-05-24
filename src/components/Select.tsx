"use client";

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
}

export default function Select({ label, id, className = "", children, ...props }: SelectProps) {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");
  return (
    <div>
      {label && (
        <label htmlFor={selectId} className="mb-1 ml-4 block text-xs font-medium text-gray-400">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`rounded-full border border-[#E5E5E5] bg-white px-5 py-3 text-base transition focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${className}`}
        {...props}
      >
        {children}
      </select>
    </div>
  );
}
