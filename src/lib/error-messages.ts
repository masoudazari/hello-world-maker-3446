/** Persian-facing translations for auth and database errors. */

const AUTH_MESSAGES: { match: RegExp; message: string }[] = [
  { match: /known to be weak|pwned|weak_password/i, message: "این رمز عبور بسیار ساده و لو رفته است. رمزی طولانی‌تر با ترکیب حروف بزرگ و کوچک، عدد و علامت انتخاب کنید." },
  { match: /password should be at least|at least \d+ characters/i, message: "رمز عبور باید حداقل ۶ کاراکتر باشد." },
  { match: /already registered|already been registered|user already exists/i, message: "این ایمیل قبلاً ثبت شده است. وارد شوید یا ایمیل دیگری انتخاب کنید." },
  { match: /invalid login credentials/i, message: "ایمیل یا رمز عبور صحیح نیست." },
  { match: /email not confirmed/i, message: "ایمیل شما هنوز تأیید نشده است. لینک تأیید را در ایمیل خود باز کنید." },
  { match: /unable to validate email|invalid email/i, message: "ایمیل واردشده معتبر نیست." },
  { match: /rate limit|too many requests|over_email_send_rate_limit/i, message: "تعداد تلاش‌ها زیاد بوده است. چند دقیقه دیگر دوباره تلاش کنید." },
  { match: /signups not allowed|signup is disabled/i, message: "ثبت‌نام در حال حاضر غیرفعال است." },
  { match: /network|fetch failed/i, message: "ارتباط با سرور برقرار نشد. اتصال اینترنت خود را بررسی کنید." },
];

export function persianAuthError(error: unknown, fallback = "عملیات انجام نشد. دوباره تلاش کنید."): string {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const found = AUTH_MESSAGES.find((m) => m.match.test(raw));
  return found ? found.message : raw ? fallback : fallback;
}

const DB_MESSAGES: { match: RegExp; message: string }[] = [
  { match: /RATE_LIMIT_HOURLY/, message: "در یک ساعت گذشته ۵ درخواست ثبت کرده‌اید. کمی بعد دوباره تلاش کنید." },
  { match: /RATE_LIMIT_DAILY/, message: "سقف ۲۰ درخواست در شبانه‌روز پر شده است." },
  { match: /RATE_LIMIT_DUPLICATE/, message: "همین کالا را چند لحظه پیش ثبت کرده‌اید؛ درخواست تکراری ثبت نمی‌شود." },
  { match: /reviews_order_id_key|duplicate key value/i, message: "برای این سفارش قبلاً نظر ثبت شده است." },
  { match: /row-level security|violates row-level/i, message: "شما اجازه انجام این کار را ندارید." },
];

export function persianDbError(error: unknown, fallback = "عملیات انجام نشد."): string {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const found = DB_MESSAGES.find((m) => m.match.test(raw));
  if (found) return found.message;
  return raw || fallback;
}
