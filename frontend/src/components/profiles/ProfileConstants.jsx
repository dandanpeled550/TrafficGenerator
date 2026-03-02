// Re-export from the canonical constants location
export {
  AGE_GROUPS,
  GENDERS,
  INTERESTS_SUGGESTIONS,
  DEVICE_BRANDS,
  SAMSUNG_MODELS,
  APPLE_MODELS,
  GOOGLE_MODELS,
  OPERATING_SYSTEMS,
  APP_CATEGORIES as APP_CATEGORIES_SUGGESTIONS,
  AD_FORMATS as AD_FORMATS_PROFILE,
  GEO_LOCATIONS_SUGGESTIONS,
  ADID_PERSISTENCE_OPTIONS,
} from "@/constants/rtbConstants";

export const getDefaultUserProfile = () => ({
  name: "",
  description: "",
  demographics: {
    age_group: "any",
    gender: "any",
    interests: []
  },
  device_preferences: {
    device_brand: "samsung",
    device_models: [],
    operating_system: "android"
  },
  app_usage: {
    preferred_app_categories: [],
    session_duration_avg_minutes: 15
  },
  rtb_specifics: {
    preferred_ad_formats: [],
    adid_persistence: "per_user"
  }
});
