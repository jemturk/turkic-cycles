import { useMemo } from "react";
import { View } from "react-native";
import { useTranslation } from "react-i18next";

import { COUNTRIES, SUGGESTED_COUNTRIES, canonicalCountry, matchRegionOption, regionConfigFor } from "@/constants/countries";
import { SearchablePicker } from "@/components/SearchablePicker";
import { TextField } from "@/components/TextField";

type LocationFieldsProps = {
  country: string;
  city: string;
  state: string;
  onCountryChange: (country: string) => void;
  onCityChange: (city: string) => void;
  onStateChange: (state: string) => void;
  errors?: { country?: string; city?: string; state?: string };
};

// Country first, then the fields that depend on it: City plus a State/Province
// picker for countries with a fixed list (US, Canada, Australia), or City plus an
// optional free-text region everywhere else. Shared by onboarding and Edit
// profile; the matching validation is requireRegionForCountry in schemas/core.
export function LocationFields({
  country,
  city,
  state,
  onCountryChange,
  onCityChange,
  onStateChange,
  errors,
}: LocationFieldsProps) {
  const { t } = useTranslation();
  const countryOptions = useMemo(() => COUNTRIES.map((name) => ({ value: name, label: name })), []);
  const canonical = canonicalCountry(country);
  const region = regionConfigFor(canonical);

  return (
    <View className="gap-4">
      <SearchablePicker
        label={t("location.country")}
        placeholder={t("location.selectCountry")}
        searchPlaceholder={t("location.searchCountries")}
        options={countryOptions}
        value={canonical}
        suggested={SUGGESTED_COUNTRIES}
        suggestedLabel={t("location.suggested")}
        allLabel={t("location.allCountries")}
        onChange={(next) => {
          // A state from the old country (e.g. "NC") means nothing in the new one.
          if (next !== canonical) onStateChange("");
          onCountryChange(next);
        }}
        error={errors?.country}
      />

      {canonical ? (
        <>
          <TextField label={t("location.city")} value={city} onChangeText={onCityChange} error={errors?.city} />

          {region.kind === "list" ? (
            <SearchablePicker
              label={t(region.labelKey)}
              placeholder={t("location.select", { field: t(region.labelKey) })}
              searchPlaceholder={t("location.search")}
              options={region.options}
              // Codes ("NC") and full names typed before the picker existed both match.
              value={matchRegionOption(region.options, state) ?? state}
              onChange={onStateChange}
              error={errors?.state}
            />
          ) : (
            <TextField
              label={t("location.regionOptional")}
              value={state}
              onChangeText={onStateChange}
              error={errors?.state}
            />
          )}
        </>
      ) : null}
    </View>
  );
}
