import type { Locale } from "@/modules/i18n";

export function LocaleSwitcher({ locale, returnTo }: { locale: Locale; returnTo: string }) {
  return (
    <div className="locale-switcher" aria-label="Language selector">
      {(["pt-BR", "en"] as const).map((option) => (
        <form action="/api/locale" method="post" key={option}>
          <input type="hidden" name="locale" value={option} />
          <input type="hidden" name="returnTo" value={returnTo} />
          <button
            type="submit"
            className={`locale-option${locale === option ? " active" : ""}`}
            aria-current={locale === option ? "true" : undefined}
          >
            {option === "pt-BR" ? "PT-BR" : "EN"}
          </button>
        </form>
      ))}
    </div>
  );
}
