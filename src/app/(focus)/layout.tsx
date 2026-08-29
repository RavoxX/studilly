/**
 * Focus layout.
 *
 * Deliberately renders no navigation, no sidebar and no footer. The exam
 * runner is the only thing that uses it: during an exam the only things on
 * screen should be the task, the answer field and the time.
 *
 * This is a separate top-level route group rather than a variant of the app
 * shell, because "distraction-free" has to mean the chrome does not exist,
 * not that it is hidden with CSS.
 */
export default function FocusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <main id="main" className="flex flex-1 flex-col">
        {children}
      </main>
    </div>
  );
}
