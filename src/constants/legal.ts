// The Privacy Policy and Terms of Service, shown in the app (Settings) and at
// turek.expo.app/privacy and /terms -- the public addresses given to the App Store
// and Google Play. In English only, as legal documents usually are.
//
// Written against what the app actually stores and does (see the tables in
// supabase/migrations and the services in src/api). Keep it in step: a policy that
// doesn't match the app is itself grounds for store rejection. Bump LEGAL_UPDATED
// on every change.

export const LEGAL_UPDATED = "October 28, 2026";
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
    `${APP_NAME} ("the app", "we", "us") is operated by ${LEGAL_OWNER}, based in the United States, who is ` +
    "responsible for your personal information (the \"controller\" under European data protection law). This " +
    "policy explains what the app collects, why, how matching uses it, who it's shared with, how long it's " +
    "kept, and the choices and rights you have.",
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
          "languages, interests, hobbies, how and when you like to meet (in person or online, and your usual " +
          "availability), travel preferences, and the residency and citizenship information you choose to give.",
        "- Answers for the kinds of connection you choose: for example your goals, what you're looking for in " +
          "a relationship, your industry and expertise, or your field and years of experience as a mentor, and " +
          "your answers to the values and lifestyle questions.",
        "- Matching choices: who you'd like to meet (age range, distance, languages, connection types), what " +
          "matters most to you in suggestions, and how much of your location others see.",
        "- Settings: language, theme, text size and notification choices.",
        "- Activity: the circles you join, events you RSVP to, the people you like, pass on, save or remove, " +
          "your connections, the messages, replies and reactions you send, your answers when the app asks " +
          "whether you met someone you connected with, and people you block or report.",
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
      heading: "Sensitive information and your consent",
      body: [
        "Three kinds of information are especially protected by law, and the app only uses them if you choose " +
          "to give them and tick a separate consent box for each:",
        "- Sexual orientation: if you look for a romantic relationship, your gender and the genders you want " +
          "to meet (and, if you describe your own gender, who can see you) can show your orientation. They're " +
          "used only to decide who you're shown to and who you see for romantic connections, and are never " +
          "shown to other members.",
        "- Religious belief: one values question asks how important faith is to you, never which faith. It's " +
          "used only for matching and is never shown to other members. You can always answer \"Prefer not to say\".",
        "- Ethnic origin: the countries your heritage comes from, if you add them. They're kept separately from " +
          "the rest of your profile, used for matching, and shown to other members only because you've " +
          "consented to it.",
        "We record when you give and withdraw each consent. You can withdraw it at any time in Edit profile: " +
          "remove the romantic connection type (which deletes those answers), choose \"Prefer not to say\" for " +
          "faith, or remove your heritage countries. From then on that information isn't used. Withdrawing " +
          "doesn't affect what was done before, and you can still use everything else in the app.",
        "We never use this information for advertising and never sell it.",
      ],
    },
    {
      heading: "Information collected automatically",
      body: [
        "- Location from your profile: to measure distance, we look up the approximate centre point of the " +
          "city you typed, using Google's geocoding service, and store it rounded to about 100 metres. It's " +
          "used only on our servers for the distance filter and matching, and never shown to anyone.",
        "- Device location: if you turn on the Local filter, the app asks for your device's approximate " +
          "location to show circles near you. It's used on your device for that filter and is not stored on " +
          "our servers.",
        "- Push notifications: if you allow them, a push token that lets us send notifications to your device, " +
          "and whether each message notification was delivered, so the sender can see it.",
        "- Matching records: when the app suggests someone, the scores behind the suggestion; and each like, " +
          "pass, save, removal and connection as it happens. See \"How matching works\" below.",
        "- Basic technical data our service providers process to run the app securely, such as IP address, " +
          "device and browser type, and request logs.",
        "- Bot protection: when you sign up or sign in, Cloudflare Turnstile checks that you're not an " +
          "automated program.",
        "We don't use advertising trackers or analytics cookies, and we don't sell your personal information or " +
          "share it for cross-context behavioral advertising.",
      ],
    },
    {
      heading: "How matching works",
      body: [
        "Discover shows members who fit both your preferences and theirs: age, distance, languages, the kinds " +
          "of connection you both want and, for romantic connections, who you each want to meet. People you've " +
          "blocked, removed or recently passed on aren't shown.",
        "The app then orders suggestions by how well you might get on, scoring what you have in common: shared " +
          "interests, the circles you're both in, values and lifestyle answers, heritage, age, distance, how and " +
          "when you like to meet, your goals, and for business and mentoring, professional fit. Your choices in " +
          "\"What matters most to you\" give some of these more or less weight, for the people you see only. A " +
          "match counts both ways: how well they fit what you want and how well you fit what they want.",
        "A suggestion can be labelled \"Strong match\" with up to two reasons, such as shared interests. Reasons " +
          "never mention anyone's heritage, faith or orientation.",
        "Ranking only decides the order you see people in. It doesn't decide anything with legal or similarly " +
          "significant effects, no one is excluded from the app by it, and you choose whom to like or message.",
        "To improve matching, we compare the scores with what happened afterwards (likes, connections and your " +
          "answers about whether you met), and adjust the weights the app uses. This is done on our servers, " +
          "and these records are kept for 24 months.",
      ],
    },
    {
      heading: "How we use your information, and our legal bases",
      body: [
        "- To create and run your account, show your profile to other members, suggest circles, events and " +
          "people, and let you connect and message (needed to provide the service you signed up for).",
        "- To use your sexual orientation, faith answer and heritage for matching (your explicit consent).",
        "- To send notifications you've allowed, such as new messages, likes and connections, and account emails " +
          "such as sign-up confirmation and password resets (providing the service, and your consent for push " +
          "notifications).",
        "- To keep the community safe: to review reports, prevent abuse, fraud and spam, and enforce our Terms. " +
          "Photos you add to your profile are checked automatically for nudity, sexual content and graphic " +
          "violence before other members can see them (our legitimate interest in a safe community, and legal " +
          "obligations where reports involve illegal content).",
        "- To improve matching and fix problems, using matching records and crash reports (our legitimate " +
          "interest in making the app work well; you can object, see below).",
        "- To check you're 18 or older (legal obligation), to verify your identity if you ask (your consent), " +
          "and to handle Plus subscriptions (providing the service).",
      ],
    },
    {
      heading: "What other members can see",
      body: [
        "Members can see your profile (name, age, photos, bio and the other profile details you add) according " +
          "to your visibility settings, your location only as precisely as you choose (city, state or just " +
          "country), which circles you're in, and, within a circle, whether you're going to or interested in " +
          "its events. Only the person you're chatting with sees your messages. People you block can't see you, " +
          "and you can't see them.",
      ],
    },
    {
      heading: "Who we share it with",
      body: [
        "We share personal information only with the service providers that run the app on our behalf, under " +
          "contracts that limit them to doing so:",
        "- Supabase: database, file storage, sign-in and server functions.",
        "- Expo (650 Industries): app updates, the website, and push notification delivery.",
        "- Google Firebase Cloud Messaging and Apple Push Notification service: delivering notifications.",
        "- Google Maps Platform (Geocoding): finding the centre point of the city on your profile.",
        "- Google Cloud Vision: the automatic check of profile photos, processed only to run the check.",
        "- Cloudflare: bot protection (Turnstile).",
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
      heading: "International transfers",
      body: [
        "We're based in the United States, and your information is stored and processed there and in other " +
          "countries where our providers operate. When information about members in the European Economic " +
          "Area, the United Kingdom or Switzerland is transferred, we rely on our providers' certification under " +
          "the EU-U.S. Data Privacy Framework (and its UK and Swiss extensions) or on the Standard Contractual " +
          "Clauses in their data processing agreements. You can ask us for details.",
      ],
    },
    {
      heading: "How long we keep it",
      body: [
        "- Your account, profile, photos, answers and settings: until you delete your account.",
        "- Messages: until either of you removes the connection or deletes your account.",
        "- Matching records and your answers about whether you met someone: 24 months, then deleted " +
          "automatically, or sooner if you delete your account.",
        "- Sensitive information: until you withdraw consent or delete your account.",
        "When you delete your account in Settings, we permanently delete your data straight away. Copies may " +
          "remain in our providers' encrypted backups for a limited time before they're overwritten. We may keep " +
          "limited records longer where the law requires it or to deal with reports of abuse.",
      ],
    },
    {
      heading: "Your choices and rights",
      body: [
        "- Edit your profile, matching choices and settings at any time in the app.",
        "- Withdraw consent for sensitive information at any time in Edit profile, as described above.",
        "- Delete your account at any time in Settings > Delete account.",
        "- Turn notifications or location access off in the app or your device settings.",
        "- Ask us for a copy of your information, or to correct or delete it, by emailing " + LEGAL_CONTACT + ".",
        "Depending on where you live, you may have further rights:",
        "- EU, EEA, UK and Switzerland: to access, correct and delete your information, to restrict or object to " +
          "how we use it (including objecting to uses based on our legitimate interests), to receive it in a " +
          "portable format, to withdraw consent at any time, and to complain to your local data protection " +
          "authority.",
        "- California and other US states with privacy laws: to know what we collect, to access and delete it, " +
          "to correct it, to limit the use of sensitive information, and not to be discriminated against for " +
          "using these rights. We don't sell or share personal information as those laws define it, and we use " +
          "sensitive information only to provide the service you asked for.",
        "We'll answer requests within one month (or sooner where the law requires it), and may need to confirm " +
          "your identity first.",
      ],
    },
    {
      heading: "Security",
      body: [
        "We use encryption in transit, access controls that limit each member to their own data, sensitive " +
          "information kept apart from the rest of your profile, and providers with strong security practices. " +
          "No system is perfectly secure, so please use a strong, unique password and tell us if you notice " +
          "anything suspicious.",
      ],
    },
    {
      heading: "Changes to this policy",
      body: [
        "We'll update this policy as the app changes and show the new date at the top. For significant changes " +
          "we'll let you know in the app or by email, and ask for your consent again where the law requires it.",
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
          "make any particular connection. Match suggestions, scores and labels such as \"Strong match\" are " +
          "estimates from what members tell us, not promises about anyone.",
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
