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
              <>
                <Link href="/sign-in">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link href="/create-account">
                  <Button>Create Account</Button>
                </Link>
              </>
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
            ClassPilot helps you organize assignments, connect Google Classroom and Drive,
            read documents and PDFs, upload files manually, rank work intelligently,
            and get assignment-specific AI help.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href={session ? "/dashboard" : "/sign-in"}>
              <Button size="lg" variant={session ? "default" : "outline"} className="text-base">
                {session ? "Go to Dashboard" : "Sign In"}
              </Button>
            </Link>
            {!session && (
              <Link href="/create-account">
                <Button size="lg" className="text-base">
                  Create Account
                </Button>
              </Link>
            )}
          </div>
        </section>

        <section className="mx-auto mt-24 max-w-4xl">
          <h2 className="mb-10 text-center text-2xl font-semibold">
            What ClassPilot Does
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            <FeatureCard
              title="Organize Assignments"
              description="Keep all your assignments in one place. Sync from Google Classroom or upload files manually. ClassPilot ranks them by urgency and importance."
            />
            <FeatureCard
              title="Connect Google Classroom & Drive"
              description="Import courses, assignments, announcements, and materials. Access Docs, Slides, and attached PDFs—all in one workspace."
            />
            <FeatureCard
              title="Read Documents & PDFs"
              description="ClassPilot reads PDFs, text files, docs, and slides to understand context. Extracted text powers smart summaries and AI help."
            />
            <FeatureCard
              title="Upload Files Manually"
              description="No Google account? No problem. Upload PDFs, TXT, DOCX, and images directly. Your files are stored securely."
            />
            <FeatureCard
              title="Intelligent Ranking"
              description="Ranks assignments by urgency, importance, difficulty, and effort—not just due date. Focus on what matters most."
            />
            <FeatureCard
              title="Assignment-Specific AI Help"
              description="Get class-context tutoring. Start assignments, understand teacher intent, and get answers to follow-up questions."
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
