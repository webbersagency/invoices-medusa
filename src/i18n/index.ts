import {messages as enMessages} from "./messages/en"
import {messages as nlMessages} from "./messages/nl"
import {messages as frMessages} from "./messages/fr"
import {messages as deMessages} from "./messages/de"
import {messages as itMessages} from "./messages/it"

export const SUPPORTED_LOCALES = [
  "en",
  "nl",
  "nl-be",
  "de",
  "fr",
  "it",
] as const

export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const resolveLocale = (
  raw: unknown,
  defaultLocale: Locale = "en"
): Locale => {
  if (
    typeof raw === "string" &&
    (SUPPORTED_LOCALES as readonly string[]).includes(raw)
  ) {
    return raw as Locale
  }
  return defaultLocale
}

export const getI18nMessages = (locale: Locale) => {
  switch (locale) {
    case "nl":
    case "nl-be":
      return nlMessages
    case "en":
      return enMessages
    case "fr":
      return frMessages
    case "de":
      return deMessages
    case "it":
      return itMessages
  }
}
