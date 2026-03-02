export const SAMSUNG_MODELS = [
  "Galaxy S24 Ultra", "Galaxy S24+", "Galaxy S24",
  "Galaxy S23 Ultra", "Galaxy S23+", "Galaxy S23", "Galaxy S23 FE",
  "Galaxy A55", "Galaxy A35", "Galaxy A15",
  "Galaxy Z Fold5", "Galaxy Z Flip5",
  "Galaxy Tab S9 Ultra", "Galaxy Tab S9+", "Galaxy Tab S9"
];

export const APPLE_MODELS = [
  "iPhone 15 Pro Max", "iPhone 15 Pro", "iPhone 15 Plus", "iPhone 15",
  "iPhone 14 Pro Max", "iPhone 14 Pro", "iPhone 14 Plus", "iPhone 14", "iPhone SE (3rd gen)",
  "iPad Pro 12.9-inch (6th gen)", "iPad Pro 11-inch (4th gen)", "iPad Air (5th gen)", "iPad (10th gen)", "iPad mini (6th gen)"
];

export const GOOGLE_MODELS = [
  "Pixel 8 Pro", "Pixel 8", "Pixel 7a", "Pixel Fold", "Pixel Tablet"
];

export const DEVICE_BRANDS = ["any", "samsung", "apple", "google"];

export const AD_FORMATS = [
  { value: "banner", label: "Banner Ads", description: "Standard display banners" },
  { value: "interstitial", label: "Interstitial", description: "Full-screen ads" },
  { value: "video", label: "Video Ads", description: "In-stream video content" },
  { value: "native", label: "Native Ads", description: "In-feed native content" },
  { value: "rewarded", label: "Rewarded Video", description: "Incentivized video ads" }
];

export const APP_CATEGORIES = [
  "Games", "Social Networking", "Shopping", "News & Magazines", "Entertainment",
  "Finance & Banking", "Health & Fitness", "Travel & Local", "Education", "Productivity & Tools",
  "Music & Audio", "Video Players & Editors", "Lifestyle", "Business"
];

export const AGE_GROUPS = ["any", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"];
export const GENDERS = ["any", "male", "female", "other"];
export const OPERATING_SYSTEMS = ["any", "android", "ios"];

export const INTERESTS_SUGGESTIONS = [
  "Technology", "Gaming", "Sports", "Fashion", "Travel",
  "Food & Dining", "Music", "Movies & TV", "Books & Literature", "Fitness & Health",
  "Finance", "Education", "Parenting", "Pets", "Automotive", "Home & Garden"
];

export const GEO_LOCATIONS_SUGGESTIONS = [
  "United States", "United Kingdom", "Canada", "Germany", "France",
  "Australia", "Japan", "Brazil", "India", "Netherlands", "Spain", "Italy"
];

export const ADID_PERSISTENCE_OPTIONS = [
  { value: "per_user", label: "Per User", description: "Same ADID for all impressions from each user" },
  { value: "per_session", label: "Per Session", description: "New ADID for each user session" },
  { value: "per_impression", label: "Per Impression", description: "Unique ADID for every impression" }
];
