import { i18nBuilder } from "keycloakify/login";
import type { ThemeName } from "../kc.gen";

/** @see: https://docs.keycloakify.dev/i18n */
const { useI18n, ofTypeI18n } = i18nBuilder
    .withThemeName<ThemeName>()
    .withCustomTranslations({
        en: {
            loginSubtitle: "Welcome back! Please enter your valid data."
        },
        de: {
            loginSubtitle: "Willkommen zurück! Bitte gib deine Daten ein."
        }
    })
    .build();

type I18n = typeof ofTypeI18n;

export { useI18n, type I18n };
