import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default async function HomePage() {
  const session = await getSession();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <header className="border-b border-border/40 bg-background/80 backdrop-blur">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <span className="text-xl font-semibold tracking-tight">
            ClassPilot
          </span>
          <nav className="flex items-center gap-4">
            {session ? (
              <Link href="/dashboard">
                <Button>Dashboard</Button>
              </Link>
            ) : (
              <Link href="/sign-in">
                <Button>Sign In</Button>
              </Link>
            )}
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        <section className="mx-auto max-w-3xl text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-foreground md:text-5xl">
            Your AI-Powered
            <br />
            <span className="text-primary">School Copilot</span>
          </h1>
          <p className="mb-10 text-lg text-muted-foreground">
            ClassPilot connects to Google Classroom, understands your classes,
            detects hidden deadlines, and gives you assignment-specific help—not
            just due date alerts.
          </p>
          <Link href={session ? "/dashboard" : "/sign-in"}>
            <Button size="lg" className="text-base">
              {session ? "Go to Dashboard" : "Get Started"}
            </Button>
          </Link>
        </section>

        <section className="mx-auto mt-24 max-w-4xl">
          <h2 className="mb-10 text-center text-2xl font-semibold">
            What ClassPilot Does
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <FeatureCard
              title="Syncs Classroom & Materials"
              description="Pulls assignments, announcements, and materials from Google Classroom. Reads Google Docs, Slides, and PDF attachments to understand context."
            />
            <FeatureCard
              title="Detects Hidden Deadlines"
              description="Finds due dates buried in descriptions, announcements, and attached files. Flags conflicts when Classroom says one date but the text says another."
            />
            <FeatureCard
              title="Intelligent Ranking"
              description="Ranks assignments by urgency, importance, difficulty, effort, and teacher emphasis—not just by due date."
            />
            <FeatureCard
              title="Assignment-Specific Help"
              description="Provides class-context tutoring. Helps you get started, understand teacher intent, and answer follow-up questions."
            />
          </div>
        </section>
      </main>
    </div>
  );
}

function FeatureCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
      <h3 className="mb-2 font-medium text-foreground">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
