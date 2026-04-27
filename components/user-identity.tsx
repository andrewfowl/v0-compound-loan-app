"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { User, LogOut, ChevronDown } from "lucide-react";

type UserBadgeProps = {
  userId: string;
  onSwitch: (newId: string) => void;
};

export function UserBadge({ userId, onSwitch }: UserBadgeProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  const handleSwitch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || trimmed.length < 2) {
      setError("Enter at least 2 characters");
      return;
    }
    onSwitch(trimmed);
    setInput("");
    setError("");
    setOpen(false);
  };

  const handleClear = () => {
    onSwitch("");
    setInput("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 rounded-full border bg-card px-3 py-1.5 text-sm shadow-sm transition-colors hover:bg-muted">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
            <User className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="max-w-[120px] truncate font-medium">
            {userId || "Set user"}
          </span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-4">
        {userId ? (
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Current user
              </p>
              <p className="mt-1 font-mono text-sm font-semibold">{userId}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Reports are fetched using this ID as the{" "}
                <code className="rounded bg-muted px-1">x-user-id</code> header.
              </p>
            </div>
            <div className="border-t pt-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Switch user</p>
              <form onSubmit={handleSwitch} className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => { setInput(e.target.value); setError(""); }}
                  placeholder="new username"
                  className="h-8 font-mono text-xs"
                />
                <Button type="submit" size="sm" className="h-8 shrink-0">
                  Switch
                </Button>
              </form>
              {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
            </div>
            <button
              onClick={handleClear}
              className="flex w-full items-center gap-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <p className="font-medium">Set your username</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Enter your username to access previously indexed reports. Reports are linked to your user ID.
              </p>
            </div>
            <form onSubmit={handleSwitch} className="space-y-2">
              <Input
                value={input}
                onChange={(e) => { setInput(e.target.value); setError(""); }}
                placeholder="e.g. user_123"
                className="font-mono text-sm"
                autoFocus
              />
              {error && <p className="text-xs text-destructive">{error}</p>}
              <Button type="submit" className="w-full">
                Continue
              </Button>
            </form>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
