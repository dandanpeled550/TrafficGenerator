
export const AGE_GROUPS = ["any", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
export const GENDERS = ["any", "male", "female", "other"];
export const INTERESTS_SUGGESTIONS = [
  "Technology", "Gaming", "Sports", "Fashion", "Travel",
  "Food & Dining", "Music", "Movies & TV", "Books & Literature", "Fitness & Health",
  "Finance", "Education", "Parenting", "Pets", "Automotive", "Home & Garden"
];
export const DEVICE_BRANDS = ["any", "samsung", "apple", "google"];
export const SAMSUNG_MODELS = [
  "Galaxy S24 Ultra", "Galaxy S24+", "Galaxy S24",
  "Galaxy S23 Ultra", "Galaxy S23+", "Galaxy S23", "Galaxy S23 FE",
  "Galaxy A55", "Galaxy A35", "Galaxy A15",
  "Galaxy Z Fold5", "Galaxy Z Flip5",
  "Galaxy Tab S9 Ultra", "Galaxy Tab S9+", "Galaxy Tab S9"
];
export const APPLE_MODELS = [ // For future use
    "iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15",
    "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14 Plus", "iPhone 14", "iPhone SE (3rd gen)",
    "iPad Pro 12.9-inch (6th gen)", "iPad Pro 11-inch (4th gen)", "iPad Air (5th gen)", "iPad (10th gen)", "iPad mini (6th gen)"
];
export const GOOGLE_MODELS = [ // For future use
    "Pixel 8 Pro", "Pixel 8", "Pixel 7a", "Pixel Fold", "Pixel Tablet"
];
export const OPERATING_SYSTEMS = ["any", "android", "ios"];
export const APP_CATEGORIES_SUGGESTIONS = [
  "Games", "Social Networking", "Shopping", "News & Magazines", "Entertainment",
  "Finance & Banking", "Health & Fitness", "Travel & Local", "Education", "Productivity & Tools",
  "Music & Audio", "Video Players & Editors", "Lifestyle", "Business"
];
export const AD_FORMATS_PROFILE = ["banner", "interstitial", "video", "native", "rewarded"];
export const GEO_LOCATIONS_SUGGESTIONS = [
  "United States", "United Kingdom", "Canada", "Germany", "France", 
  "Australia", "Japan", "Brazil", "India", "Netherlands", "Spain", "Italy"
];
export const ADID_PERSISTENCE_OPTIONS = [
  { value: "per_user", label: "Per User", description: "Same ADID for all impressions from each user" },
  { value: "per_session", label: "Per Session", description: "New ADID for each user session" },
  { value: "per_impression", label: "Per Impression", description: "Unique ADID for every impression" }
];

export const getDefaultUserProfile = () => ({
  profile_name: "",
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
