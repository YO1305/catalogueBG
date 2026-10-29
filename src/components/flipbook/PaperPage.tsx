"use client";

/** Native page root for react-pageflip (React 19: ref is a normal prop; forwardRef breaks page-flip's cloneElement refs). */
export function PaperPage({
  hard,
  children,
  ref,
}: {
  hard?: boolean;
  children: React.ReactNode;
  ref?: React.Ref<HTMLDivElement>;
}) {
  return (
    <div ref={ref} data-density={hard ? "hard" : "soft"} className="paper-page h-full w-full overflow-hidden">
      {children}
    </div>
  );
}
