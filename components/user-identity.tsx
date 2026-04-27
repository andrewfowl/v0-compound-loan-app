"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { User, LogOut } from "lucide-react";

type Props = {
  onConfirm: (userId: string) => void;
};

export function UserIdentityGate({ onConfirm }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Please enter a username");
      return;
    }
    if (trimmed.length < 2) {
      setError("Username must be at least 2 characters");
      return;
    }
    onConfirm(trimmed);
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
          <User className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Welcome to Compound Reporting</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          DeFi portfolio analytics and reconciliation
        </p>
      </div>

      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Sign In</CardTitle>
          <CardDescription>
            Enter your username to access your reports. Use the same username to retrieve previously generated reports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Input
                value={value}
                onChange={(e) => {
                  setValue(e.target.value);
                  setError("");
                }}
                placeholder="e.g. user_123"
                className="font-mono"
                autoFocus
              />
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
            </div>
            <Button type="submit" className="w-full">
              Continue
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="mt-8 max-w-sm text-center text-xs text-muted-foreground">
        Your username is used to associate reports with your account. No password required.
      </p>
    </div>
  );
}

type HeaderProps = {
  userId: string;
  onSwitch: () => void;
};

export function UserBadge({ userId, onSwitch }: HeaderProps) {
  return (
    <div className="flex items-center gap-3 rounded-full border bg-card px-4 py-2 shadow-sm">
      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10">
        <User className="h-4 w-4 text-primary" />
      </div>
      <span className="text-sm font-medium">{userId}</span>
      <button
        onClick={onSwitch}
        className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        title="Switch user"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </div>
  );
}
