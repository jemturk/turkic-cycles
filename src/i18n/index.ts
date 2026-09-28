/* eslint-disable import/no-named-as-default-member -- this is i18next's own
   plugin-registration method (i18n.use), not a named export named "use". */
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import tr from "./locales/tr.json";

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    tr: { translation: tr },
  },
  lng: "en",
  fallbackLng: "en",
  // React already escapes values when rendering; i18next's own escaping would
  // double-escape (e.g. turn "&" into "&amp;amp;").
  interpolation: { escapeValue: false },
});

export default i18n;
