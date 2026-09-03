import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { issueCaptcha } from "@/lib/captcha.functions";
import { fa } from "@/lib/format";

export type CaptchaState = { token: string; answer: string };

/** Human check shown before spam-sensitive submissions (e.g. new RFQ). */
export function CaptchaField({
  value,
  onChange,
}: {
  value: CaptchaState;
  onChange: (next: CaptchaState) => void;
}) {
  const issue = useServerFn(issueCaptcha);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  async function refresh() {
    setLoading(true);
    try {
      const result = await issue();
      setQuestion(result.question);
      onChange({ token: result.token, answer: "" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <Label className="mb-2 block text-xs">تأیید انسان بودن</Label>
      <div className="flex items-center gap-2">
        <span className="rounded-xl border border-border bg-secondary px-3 py-2 text-sm font-bold tabular-nums">
          {question ? `${fa(question)} = ؟` : "…"}
        </span>
        <Input
          className="max-w-24"
          inputMode="numeric"
          value={value.answer}
          onChange={(e) => onChange({ ...value, answer: e.target.value })}
          placeholder="پاسخ"
        />
        <Button type="button" variant="ghost" size="icon" onClick={() => void refresh()} disabled={loading} aria-label="سؤال جدید">
          <RefreshCw className="size-4" />
        </Button>
      </div>
    </div>
  );
}
