/* eslint-disable import/no-named-as-default-member -- this is i18next's own
   plugin-registration method (i18n.use), not a named export named "use". */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import tr from "./locales/tr.json";
import ru from "./locales/ru.json";
import de from "./locales/de.json";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    tr: { translation: tr },
    ru: { translation: ru },
    de: { translation: de },
  },
  lng: "en",
  fallbackLng: "en",
  // React already escapes values when rendering; i18next's own escaping would
  // double-escape (e.g. turn "&" into "&amp;amp;").
  interpolation: { escapeValue: false },
});

export default i18n;
