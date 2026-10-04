// Shown instantly while the next app page renders on the server, so tapping a
// nav link responds right away instead of appearing to do nothing.
export default function AppLoading() {
  return (
    <div role="status" aria-label="Loading" className="flex flex-col gap-4 motion-safe:animate-pulse">
      <div className="h-8 w-1/3 rounded-lg bg-well" />
      <div className="h-32 rounded-2xl bg-well" />
      <div className="h-20 rounded-2xl bg-well" />
      <div className="h-20 rounded-2xl bg-well" />
    </div>
  );
}
