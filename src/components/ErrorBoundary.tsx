import { Component, ReactNode } from "react";
import { Button } from "@/components/ui/button";

interface State { hasError: boolean; error?: Error }

export default class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("ErrorBoundary caught:", error, info);
  }

  reset = () => this.setState({ hasError: false, error: undefined });

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-background">
          <div className="max-w-md w-full text-center space-y-4">
            <div className="label-mono text-muted-foreground">error</div>
            <h1 className="text-3xl font-extrabold tracking-tighter">Something went sideways.</h1>
            <p className="text-muted-foreground text-sm">{this.state.error?.message ?? "Unknown error"}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={this.reset} variant="outline" className="rounded-full">Try again</Button>
              <Button onClick={() => (window.location.href = "/")} className="rounded-full bg-foreground text-background hover:bg-foreground/90">Go home</Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
