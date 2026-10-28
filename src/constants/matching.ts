// The matching model's tag lists (Matching Model v1 spec, "Tag lists"). Members pick
// from these fixed lists, never free text; each tag is stored by its ID and shown in
// the member's app language (constants.<list>.<id> in src/i18n/locales), so people
// using different languages still match on the same tags.
//
// IDs are permanent: add new ones, but never rename or reuse an ID once stored.
// The tunable numbers (weights, thresholds, goal pairs) live in the database, in
// matching_config (migration 0054), not here.

export const INTEREST_GROUPS = [
  {
    id: "food_culture",
    tags: [
      "cooking",
      "turkic_cuisine",
      "restaurants_cafes",
      "tea_coffee",
      "folk_dance",
      "traditional_music",
      "cultural_holidays",
      "language_exchange",
      "history_heritage",
      "tavla_board_games",
    ],
  },
  {
    id: "sports_outdoors",
    tags: [
      "soccer",
      "basketball",
      "volleyball",
      "tennis_pickleball",
      "running",
      "gym_fitness",
      "yoga_pilates",
      "hiking_nature",
      "beach_water",
      "cycling",
      "fishing",
    ],
  },
  {
    id: "arts_entertainment",
    tags: [
      "movies_series",
      "turkic_cinema",
      "live_music",
      "reading",
      "poetry_literature",
      "painting_crafts",
      "photography",
      "theater_performing",
    ],
  },
  {
    id: "family_community",
    tags: ["family_outings", "kids_activities", "volunteering", "community_events", "pets", "gardening"],
  },
  {
    id: "learning_lifestyle",
    tags: [
      "travel",
      "technology",
      "entrepreneurship",
      "personal_finance",
      "personal_growth",
      "wellness_meditation",
      "fashion_style",
    ],
  },
] as const;

export type InterestTag = (typeof INTEREST_GROUPS)[number]["tags"][number];
export const INTERESTS: readonly InterestTag[] = INTEREST_GROUPS.flatMap((group) => group.tags);

// Mentor goals serve both sides: mentees pick what they want help with, mentors
// what they can help with.
export const GOALS = {
  friend: [
    "explore_city",
    "weekend_activities",
    "cultural_events",
    "practice_language",
    "family_meetups",
    "activity_partner",
    "new_to_area",
    "close_friendship",
  ],
  romantic: ["long_term", "marriage_minded", "see_where_it_goes", "shared_culture", "start_family", "companionship"],
  mentor: [
    "career_change",
    "leadership",
    "start_business",
    "us_job_search",
    "industry_insight",
    "grow_network",
    "skill_building",
    "education_path",
  ],
  business: [
    "find_cofounder",
    "find_clients",
    "offer_services",
    "find_investors",
    "invest_in_ventures",
    "partnerships",
    "import_export",
    "freelance_collab",
  ],
} as const;

export type GoalType = keyof typeof GOALS;

export const INDUSTRIES = [
  "technology",
  "finance_banking",
  "insurance",
  "healthcare",
  "education",
  "engineering",
  "law",
  "real_estate",
  "construction",
  "manufacturing",
  "energy",
  "hospitality_food",
  "retail_ecommerce",
  "logistics_trade",
  "transportation",
  "media_marketing",
  "arts_design",
  "consulting",
  "government",
  "nonprofit",
] as const;

// One list for both expertise_offered and expertise_sought, so they match directly.
export const EXPERTISE = [
  "software_dev",
  "data_analytics",
  "ai_ml",
  "cybersecurity",
  "data_governance",
  "product_mgmt",
  "project_program_mgmt",
  "process_improvement",
  "ux_design",
  "graphic_design",
  "marketing",
  "digital_marketing",
  "sales",
  "business_dev",
  "finance_accounting",
  "fundraising",
  "legal_compliance",
  "hr_recruiting",
  "operations",
  "supply_chain",
  "import_export_ops",
  "small_business",
  "real_estate_investing",
  "leadership",
  "public_speaking",
  "career_coaching",
  "teaching_training",
] as const;

// How and when members like to meet, asked of everyone (profiles.meeting_format,
// profiles.availability; migration 0059).
export const MEETING_FORMATS = ["in_person", "virtual", "either"] as const;
export type MeetingFormat = (typeof MEETING_FORMATS)[number];
export const AVAILABILITY = ["weekday_daytime", "weekday_evening", "weekend"] as const;

// The values & lifestyle questions (1-5, or 0 = prefer not to say), by key; the
// matching model numbers them 1-5 in this order. Friend and Romantic answer all five,
// Mentor and Business only social energy and pace (the personal ones carry little
// weight there).
export const VALUES_QUESTIONS = ["family", "faith", "social", "pace", "heritage"] as const;
export type ValuesQuestion = (typeof VALUES_QUESTIONS)[number];
export const PROFESSIONAL_VALUES_QUESTIONS: readonly ValuesQuestion[] = ["social", "pace"];

// Romantic: gender, who they want to see, and -- for someone who self-describes -- who
// they're shown to.
export const GENDERS = ["woman", "man", "self_describe"] as const;
export const GENDER_GROUPS = ["women", "men"] as const;

// Where a mentor / mentee or business contact should be (pass-or-fail, no proximity score).
export const LOCATION_PREFS = ["anywhere", "same_country", "same_state", "nearby"] as const;

export const SELECTION_LIMITS = {
  interests: { min: 3, max: 10 },
  goals: { min: 1, max: 3 },
  expertise: { max: 5 },
} as const;
