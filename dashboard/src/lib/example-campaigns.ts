import type { CampaignPayload } from "./api";

export interface ExampleCampaign {
  id: string;
  label: string;
  description: string;
  why: string;
  campaign: CampaignPayload;
  n_personas: number;
  n_simulations: number;
}

export const exampleCampaigns: ExampleCampaign[] = [
  {
    id: "fitness-video-meta",
    label: "Fitness App — Meta Video",
    description:
      "Vertical video ad promoting a fitness app to health-conscious 22–38 year-olds on Instagram/Meta.",
    why: "Video creative on Meta with strong interest overlap (fitness) tends to produce high CTR. Younger audience with high attention span boosts engagement.",
    campaign: {
      name: "Fitness App Launch",
      objective: "sales",
      target_platform: "Meta",
      creative_type: "video",
      budget: 5000,
      ad_copy:
        "Transform your morning routine. 10-minute AI workouts, personalized to your goals. Start free.",
      creative_description:
        "Vertical 15s video: split-screen before/after transformation, upbeat music, app UI overlay, end with CTA button.",
      target_interests: ["fitness", "sports"],
      target_age_min: 22,
      target_age_max: 38,
    },
    n_personas: 1000,
    n_simulations: 10000,
  },
  {
    id: "saas-google-text",
    label: "B2B SaaS — Google Search",
    description:
      "Text ad on Google Search targeting startup founders looking for project management tools.",
    why: "Google Search text ads capture high-intent users. Targeting finance/startups interests with older age range aligns with B2B decision-makers.",
    campaign: {
      name: "ProjectFlow Pro — Search",
      objective: "leads",
      target_platform: "Google",
      creative_type: "text",
      budget: 8000,
      ad_copy:
        "Ship 2x faster. ProjectFlow replaces 5 tools with one AI workspace. Free for teams under 10.",
      creative_description:
        "Google responsive search ad with 3 headlines emphasizing speed, cost savings, and free tier. Sitelinks to pricing and case studies.",
      target_interests: ["startups", "finance"],
      target_keywords: ["project management", "team collaboration"],
      target_age_min: 28,
      target_age_max: 55,
    },
    n_personas: 1000,
    n_simulations: 10000,
  },
  {
    id: "ecommerce-tiktok-video",
    label: "E-commerce — TikTok Viral",
    description:
      "Short-form video ad for a trendy skincare brand targeting Gen Z on TikTok.",
    why: "TikTok's higher base CTR for young audiences combined with video creative and beauty interest overlap should produce strong engagement but potentially lower conversion (awareness-stage audience).",
    campaign: {
      name: "GlowUp Serum Drop",
      objective: "traffic",
      target_platform: "TikTok",
      creative_type: "video",
      budget: 3000,
      ad_copy:
        "POV: your skin after 7 days. No filter needed. #GlowUpSerum",
      creative_description:
        "9:16 UGC-style video: creator applies serum, time-lapse skin transformation over 7 days, comment overlay with social proof.",
      target_interests: ["beauty", "fitness"],
      target_age_min: 18,
      target_age_max: 28,
    },
    n_personas: 1000,
    n_simulations: 10000,
  },
  {
    id: "finance-google-carousel",
    label: "Finance App — Google Carousel",
    description:
      "Carousel display ad for a personal finance app targeting high-income professionals.",
    why: "High-income personas have stronger purchase intent. Carousel creative lets you show multiple value props. Finance interest overlap amplifies CTR.",
    campaign: {
      name: "WealthTrack Premium",
      objective: "sales",
      target_platform: "Google",
      creative_type: "carousel",
      budget: 10000,
      ad_copy:
        "See all your money in one place. Smart budgets, investment tracking, and AI savings goals.",
      creative_description:
        "4-card carousel: card 1 = dashboard screenshot, card 2 = savings goal progress, card 3 = investment chart, card 4 = 5-star review quote.",
      target_interests: ["finance", "startups"],
      target_age_min: 30,
      target_age_max: 55,
    },
    n_personas: 1000,
    n_simulations: 10000,
  },
  {
    id: "education-meta-image",
    label: "Online Course — Meta Image",
    description:
      "Static image ad for an online coding bootcamp targeting career changers.",
    why: "Image ads are cost-effective on Meta. Education interest overlap with moderate purchase intent creates a balanced CTR/conversion profile.",
    campaign: {
      name: "CodeShift Bootcamp",
      objective: "leads",
      target_platform: "Meta",
      creative_type: "image",
      budget: 4000,
      ad_copy:
        "Go from zero to hired in 12 weeks. Live mentorship, real projects, job guarantee. Apply now — spots limited.",
      creative_description:
        "Clean hero image: laptop with code editor, gradient background, bold headline overlay, mentor headshots in corner badges.",
      target_interests: ["education", "startups"],
      target_age_min: 24,
      target_age_max: 42,
    },
    n_personas: 1000,
    n_simulations: 10000,
  },
];
