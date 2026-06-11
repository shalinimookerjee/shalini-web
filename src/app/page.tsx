export default function Home() {
  return (
    <main>
      <section className="flex min-h-screen flex-col items-center justify-center gap-4 text-center">
        <h1 className="text-5xl font-semibold tracking-tight sm:text-7xl">
          Shalini Mookerjee
        </h1>
        <p className="text-lg text-neutral-500">Designer — site in progress.</p>
        <p className="mt-8 text-sm text-neutral-400">Scroll ↓</p>
      </section>

      <section className="flex min-h-screen items-center justify-center">
        <p className="max-w-md text-center text-2xl text-neutral-600">
          Smooth scroll is wired up. This is where the canvas, Rive animations,
          and interactions will live.
        </p>
      </section>
    </main>
  );
}
