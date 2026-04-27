"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Compound Reporting</CardTitle>
          <CardDescription>
            Enter your username to access your reports. Use the same username each time to retrieve previously generated reports.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
            <Button type="submit" className="w-full">
              Continue
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

type HeaderProps = {
  userId: string;
  onSwitch: () => void;
};

export function UserBadge({ userId, onSwitch }: HeaderProps) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span>
        Signed in as <code className="font-mono font-medium text-foreground">{userId}</code>
      </span>
      <Button variant="ghost" size="sm" className="h-auto p-0 text-xs underline-offset-2 hover:underline" onClick={onSwitch}>
        Switch
      </Button>
    </div>
  );
}
