// The Privacy Policy and Terms of Service, shown in the app (Settings) and at
// turek.expo.app/privacy and /terms -- the public addresses given to the App Store
// and Google Play. In English only, as legal documents usually are.
//
// Written against what the app actually stores and does (see the tables in
// supabase/migrations and the services in src/api). Keep it in step: a policy that
// doesn't match the app is itself grounds for store rejection. Bump LEGAL_UPDATED
// on every change.

export const LEGAL_UPDATED = "October 17, 2026";
export const LEGAL_OWNER = "Jem Turk";
export const LEGAL_CONTACT = "unturkk@gmail.com";
export const APP_NAME = "Turkic Circles";

export type LegalSection = {
  heading: string;
  // Paragraphs, and "- " lines become bullet points.
  body: string[];
};

export type LegalDocument = { title: string; intro: string; sections: LegalSection[] };

export const PRIVACY_POLICY: LegalDocument = {
  title: "Privacy Policy",
  intro:
    `${APP_NAME} ("the app", "we", "us") is operated by ${LEGAL_OWNER}, based in the United States. ` +
    "This policy explains what personal information the app collects, why, who it's shared with, and the " +
    "choices and rights you have. By using the app you agree to this policy.",
  sections: [
    {
      heading: "Who can use the app",
      body: [
        "The app is only for adults aged 18 or older. We ask for your date of birth when you sign up and don't " +
          "allow accounts for anyone younger. If we learn that someone under 18 has an account, we delete it.",
      ],
    },
    {
      heading: "Information you give us",
      body: [
        "- Account: your email address and password, or the account details Apple or Google share when you " +
          "sign in with them (your name and email). Passwords are stored only in hashed form by our " +
          "authentication provider.",
        "- Profile: your display name, date of birth, photos, bio, city, state and country, occupation, " +
          "languages, interests, hobbies, travel preferences, residency and citizenship information you choose " +
          "to give, and your answers to the onboarding questionnaire.",
        "- Sensitive information, only if you choose to share it: your countries of origin, religious " +
          "affiliation and citizenship-status details. These are optional, stored separately from the rest of " +
          "your profile, and only used or shown with your explicit consent, which we record and which you can " +
          "withdraw at any time.",
        "- Preferences: who you'd like to meet (age range, distance, languages, connection types), and your " +
          "app settings such as language, theme, text size and notification choices.",
        "- Activity: the circles you join, events you RSVP to, the people you like or pass on, your matches, " +
          "the messages, replies and reactions you send, and people you block or report.",
        "- Safety plans: when you create one, the person you're meeting, the place and time, and the names " +
          "and phone numbers of the trusted contacts you enter. The app writes a text to those contacts and " +
          "opens your phone's Messages app; it's only sent if you send it, from your own phone. Check-in " +
          "reminders are scheduled on your device.",
        "- Identity verification: if you choose to get verified, Stripe Identity collects a photo of your " +
          "government ID and a live selfie, and checks that they match. Those images and the details on your " +
          "ID are processed by Stripe under its own privacy policy, not stored by us; we keep only whether you " +
          "are verified and a reference to the check. Verification uses biometric technology to compare your " +
          "selfie with your ID photo, and only with your consent when you start it.",
        "- Support: anything you send us when you contact us.",
      ],
    },
    {
      heading: "Information collected automatically",
      body: [
        "- Location: if you turn on the Local filter, the app asks for your device's approximate location to " +
          "show circles near you. It's used on your device for that filter and is not stored on our servers.",
        "- Push notifications: if you allow them, a push token that lets us send notifications to your device.",
        "- Basic technical data our service providers process to run the app securely, such as IP address, " +
          "device and browser type, and request logs.",
        "- Bot protection: when you sign up or sign in, Cloudflare Turnstile checks that you're not an " +
          "automated program.",
        "We don't use advertising trackers, and we don't sell your personal information or share it for " +
          "cross-context behavioral advertising.",
      ],
    },
    {
      heading: "How we use your information",
      body: [
        "- To create and run your account and show your profile to other members.",
        "- To suggest circles, events and people, and to let you match and message.",
        "- To send you notifications you've allowed, such as new messages and matches, and account emails " +
          "such as sign-up confirmation and password resets.",
        "- To keep the community safe: to review reports, prevent abuse, fraud and spam, enforce our Terms, and " +
          "comply with the law. Photos you add to your profile are checked automatically for nudity, sexual " +
          "content and graphic violence before other members can see them.",
        "- To handle Plus subscriptions.",
        "- To fix problems and improve the app.",
      ],
    },
    {
      heading: "What other members can see",
      body: [
        "Members can see your profile (name, age, photos, bio, city and the other profile details you add) " +
          "according to your visibility settings, which circles you're in, and, within a circle, whether you're " +
          "going to or interested in its events. Only the person you're chatting with sees your messages. " +
          "Sensitive information is only shown if you've consented to it. People you block can't see you, and " +
          "you can't see them.",
      ],
    },
    {
      heading: "Who we share it with",
      body: [
        "We share personal information only with the service providers that run the app on our behalf, under " +
          "their own privacy and security commitments:",
        "- Supabase: database, file storage and sign-in.",
        "- Expo (650 Industries): app updates, the website, and push notification delivery.",
        "- Google Firebase Cloud Messaging and Apple Push Notification service: delivering notifications.",
        "- Cloudflare: bot protection (Turnstile).",
        "- Google Cloud Vision: the automatic check of profile photos, processed only to run the check.",
        "- Stripe: identity verification (Stripe Identity), if you choose to get verified.",
        "- Sentry (Functional Software): crash and error reports, identified only by your account ID, to " +
          "help us fix problems.",
        "- Apple and Google: Sign in with Apple and Google sign-in, if you use them, and app-store purchases.",
        "- RevenueCat: managing Plus subscriptions.",
        "- Our email delivery provider: sending account emails.",
        "We may also disclose information if the law requires it, to protect someone's safety, to investigate " +
          "fraud or abuse, or as part of a sale or reorganization of the app, in which case this policy would " +
          "continue to apply.",
      ],
    },
    {
      heading: "Where it's stored",
      body: [
        "Your information is stored and processed in the United States and other countries where our providers " +
          "operate. If you live outside the United States, using the app means your information will be " +
          "transferred there.",
      ],
    },
    {
      heading: "How long we keep it",
      body: [
        "We keep your information while your account exists. When you delete your account in Settings, we " +
          "permanently delete your profile, photos, matches, messages and other account data straight away. " +
          "Copies may remain in our providers' encrypted backups for a limited time before they're overwritten. " +
          "We may keep limited records longer where the law requires it or to deal with reports of abuse.",
      ],
    },
    {
      heading: "Your choices and rights",
      body: [
        "- Edit your profile and settings, and withdraw consent for sensitive information, at any time in the app.",
        "- Delete your account at any time in Settings > Delete account.",
        "- Turn notifications or location access off in the app or your device settings.",
        "- Ask us for a copy of your information, or to correct or delete it, by emailing " + LEGAL_CONTACT + ".",
        "Depending on where you live, you may have further rights:",
        "- EU, EEA and UK: to access, correct, delete, restrict or object to processing of your information, to " +
          "data portability, and to complain to your local data protection authority. We process your " +
          "information to provide the service you signed up for (contract), with your consent (sensitive " +
          "information, notifications, location), and for our legitimate interests in keeping the app safe.",
        "- California and other US states with privacy laws: to know what we collect, to access and delete it, " +
          "to correct it, and not to be discriminated against for using these rights. We don't sell or share " +
          "personal information as those laws define it.",
        "We'll answer requests within the time the law allows, and may need to confirm your identity first.",
      ],
    },
    {
      heading: "Security",
      body: [
        "We use encryption in transit, access controls that limit each member to their own data, and " +
          "providers with strong security practices. No system is perfectly secure, so please use a strong, " +
          "unique password and tell us if you notice anything suspicious.",
      ],
    },
    {
      heading: "Changes to this policy",
      body: [
        "We'll update this policy as the app changes and show the new date at the top. For significant changes " +
          "we'll let you know in the app or by email.",
      ],
    },
    {
      heading: "Contact",
      body: [`Questions or requests about your privacy: ${LEGAL_OWNER}, ${LEGAL_CONTACT}.`],
    },
  ],
};

export const TERMS_OF_SERVICE: LegalDocument = {
  title: "Terms of Service",
  intro:
    `These terms are an agreement between you and ${LEGAL_OWNER}, who operates ${APP_NAME}. By creating an ` +
    "account or using the app, you agree to them and to our Privacy Policy. If you don't agree, please don't " +
    "use the app.",
  sections: [
    {
      heading: "Who can use the app",
      body: [
        "You must be at least 18 years old, able to agree to these terms, and not barred from using the app by " +
          "law or by an earlier removal from it. You may only have one account, and the information you give " +
          "about yourself must be true.",
      ],
    },
    {
      heading: "Your account",
      body: [
        "Keep your sign-in details safe; you're responsible for what happens on your account. Tell us straight " +
          "away if you think someone else has access to it.",
      ],
    },
    {
      heading: "Community rules",
      body: [
        "We have zero tolerance for objectionable content and abusive behavior. You must not:",
        "- harass, bully, threaten, stalk or intimidate anyone;",
        "- post or send hate speech, or content that demeans people for their ethnicity, nationality, religion, " +
          "gender, sexual orientation, disability or other characteristics;",
        "- post nudity, sexually explicit or violent content, or anything involving minors;",
        "- impersonate anyone, or misrepresent your identity, age or intentions;",
        "- scam, solicit money, advertise, spam, or promote other services without our permission;",
        "- share someone else's private information without their consent;",
        "- put contact details (phone numbers, email addresses, social media handles) in your profile or bio; " +
          "share them in chat, with people you choose;",
        "- post content you don't have the right to share, or that breaks the law;",
        "- use the app for anything illegal, or try to hack, scrape, overload or misuse it.",
      ],
    },
    {
      heading: "Reporting, blocking and enforcement",
      body: [
        "You can block anyone and report profiles or behavior from their profile or the Safety Center. We " +
          "review reports, aiming to act within 24 hours, and may remove content, limit features, or suspend or " +
          "permanently remove accounts that break these terms, with or without notice. We may also report " +
          "illegal activity to the authorities.",
      ],
    },
    {
      heading: "Meeting people safely",
      body: [
        "We don't run criminal background checks or verify every member's identity, and we aren't responsible " +
          "for how members behave on or off the app. Take care when talking to and meeting people: meet in " +
          "public places, tell a friend where you're going, don't send money, and report anyone who makes you " +
          "uncomfortable. The app's safety features are aids, not guarantees. In an emergency, contact local " +
          "emergency services.",
      ],
    },
    {
      heading: "Your content",
      body: [
        "You keep ownership of the photos, profile details and messages you post. You give us a worldwide, " +
          "non-exclusive, royalty-free licence to store, display and process that content as needed to run and " +
          "improve the app, which ends when you delete it or your account (except copies others already " +
          "received, such as messages). You're responsible for your content and confirm you have the right to " +
          "share it.",
      ],
    },
    {
      heading: "Plus subscriptions",
      body: [
        "Plus is an optional paid subscription. It's billed through your App Store or Google Play account at " +
          "the price shown before you buy, and renews automatically for the same period unless you cancel at " +
          "least 24 hours before it renews. You can manage or cancel it in your App Store or Google Play account " +
          "settings; deleting the app or your account doesn't cancel it. Refunds are handled by Apple or Google " +
          "under their policies. Prices and features may change, and we'll tell you before a change affects you.",
      ],
    },
    {
      heading: "The app itself",
      body: [
        "The app, its design and its content (other than members' content) belong to us. We may change, pause " +
          "or stop features at any time. You may stop using the app and delete your account whenever you like.",
      ],
    },
    {
      heading: "Disclaimers",
      body: [
        'The app is provided "as is" and "as available", without warranties of any kind, to the fullest ' +
          "extent the law allows. We don't promise that it will always be available, error-free, or that you'll " +
          "make any particular connection.",
      ],
    },
    {
      heading: "Limitation of liability",
      body: [
        "To the fullest extent the law allows, we aren't liable for indirect, incidental, special or " +
          "consequential damages, or for the conduct of any member, on or off the app. Our total liability for " +
          "any claim is limited to the greater of the amount you paid us in the 12 months before the claim or " +
          "US$100. Some places don't allow these limits, so they may not all apply to you.",
      ],
    },
    {
      heading: "Indemnity",
      body: [
        "You agree to cover us for claims, losses and costs arising from your content, your use of the app, or " +
          "your breaking these terms or the law.",
      ],
    },
    {
      heading: "Governing law",
      body: [
        "These terms are governed by the laws of the State of Florida, USA, without regard to its conflict-of-law " +
          "rules. Any dispute will be handled in the state or federal courts located in Florida, unless the law " +
          "where you live gives you the right to bring it there.",
      ],
    },
    {
      heading: "Apple App Store",
      body: [
        "If you got the app from Apple's App Store: these terms are between you and us, not Apple, and Apple " +
          "isn't responsible for the app or its support. Apple and its subsidiaries are third-party " +
          "beneficiaries of these terms and may enforce them against you.",
      ],
    },
    {
      heading: "Changes to these terms",
      body: [
        "We may update these terms and will show the new date at the top. For significant changes we'll let you " +
          "know in the app or by email. Continuing to use the app after a change means you accept it.",
      ],
    },
    {
      heading: "Contact",
      body: [`Questions about these terms: ${LEGAL_OWNER}, ${LEGAL_CONTACT}.`],
    },
  ],
};

// turek.expo.app/delete-account: how to delete an account, for people who no longer
// have the app. Google Play requires a public page like this (Data safety).
export const DELETE_ACCOUNT: LegalDocument = {
  title: "Delete your account",
  intro:
    `You can delete your ${APP_NAME} account and its data at any time, in the app or on the website. ` +
    "Deleting is permanent and can't be undone.",
  sections: [
    {
      heading: "In the app",
      body: [
        "- Open the app and sign in.",
        "- Go to Settings and tap Delete account.",
        "- Confirm. Your account is deleted straight away and you're signed out.",
      ],
    },
    {
      heading: "On the website (no app needed)",
      body: [
        "- Go to https://turek.expo.app and sign in with the same email and password, or Google account. " +
          "(Sign in with Apple works in the iPhone app only; if that's how you signed up, use the app or email us.)",
        "- Open Settings and choose Delete account, then confirm.",
      ],
    },
    {
      heading: "By email",
      body: [
        `If you can't sign in, email ${LEGAL_CONTACT} from the address on your account and ask us to delete ` +
          "it. We may ask you to confirm it's your account, and we'll delete it within 30 days.",
      ],
    },
    {
      heading: "What's deleted",
      body: [
        "Your profile and photos, your circle memberships and event RSVPs, your likes and matches, your " +
          "messages and reactions, your safety plans and trusted contacts, your settings and your " +
          "verification status.",
        "Copies may remain in our providers' encrypted backups for a limited time before they're " +
          "overwritten. We may keep limited records where the law requires it or to deal with reports of " +
          "abuse.",
      ],
    },
    {
      heading: "Plus subscriptions",
      body: [
        "Deleting your account doesn't cancel a Plus subscription. Cancel it in your App Store or Google " +
          "Play account settings first, so you're not charged again.",
      ],
    },
  ],
};

// turek.expo.app/child-safety: published standards against child sexual abuse and
// exploitation (CSAE). Google Play requires a public page like this for social apps.
export const CHILD_SAFETY: LegalDocument = {
  title: "Child safety standards",
  intro:
    `${APP_NAME} is for adults only. We have zero tolerance for child sexual abuse and exploitation (CSAE), ` +
    "including child sexual abuse material (CSAM), grooming, sextortion and any sexualisation of minors. " +
    "These standards explain how we prevent it, how to report it, and what we do when it's reported.",
  sections: [
    {
      heading: "Adults only",
      body: [
        "- You must be 18 or older to use the app. Members give their date of birth when they sign up, and " +
          "accounts under 18 can't be created.",
        "- Accounts we believe belong to someone under 18 are removed.",
        "- Members can verify their identity with a government ID and a live selfie, and verified members " +
          "show a badge.",
      ],
    },
    {
      heading: "What's prohibited",
      body: [
        "- Any content that sexualises, exploits or endangers a minor, including images, video, text, links " +
          "and drawn or AI-generated material.",
        "- Grooming: contacting, befriending or manipulating a minor for sexual purposes, or asking anyone " +
          "for access to a minor.",
        "- Sextortion, trafficking, or offering, requesting or sharing CSAM in any form.",
        "- Using the app to arrange contact with a minor, including at circle events.",
      ],
    },
    {
      heading: "How to report",
      body: [
        "- In the app: open the person's profile or your conversation with them, choose Report, and pick " +
          "\"Child safety\". You can add details. You can also block them straight away.",
        `- By email: ${LEGAL_CONTACT}. Please don't attach or forward abusive images; describe what you ` +
          "saw and where, and we'll find it.",
        "- If a child is in immediate danger, call your local emergency number (911 in the US) first.",
        "- In the US you can also report directly to the National Center for Missing & Exploited Children " +
          "(NCMEC) at report.cybertip.org or 1-800-843-5678.",
      ],
    },
    {
      heading: "What we do",
      body: [
        "- Child safety reports are reviewed first, before any other reports.",
        "- We remove the content and permanently ban the accounts involved, and stop them from signing up " +
          "again where we can.",
        "- We report apparent CSAM to NCMEC, as US law requires, and to other relevant authorities. We " +
          "preserve the relevant information and cooperate with law enforcement requests.",
        "- We don't tell the reported person who reported them.",
      ],
    },
    {
      heading: "Contact",
      body: [
        `Our designated contact for child safety, including questions from authorities, is ${LEGAL_OWNER}, ` +
          `${LEGAL_CONTACT}.`,
      ],
    },
  ],
};
