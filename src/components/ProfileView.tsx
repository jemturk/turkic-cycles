import { useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import { Text } from "@/components/Text";
import { useTranslation } from "react-i18next";

import { calculateAge } from "@/lib/age";
import type { ConnectionType } from "@/constants/connectionTypes";
import type { Tables } from "@/types/database";
import { useProfilePhotos } from "@/hooks/useGallery";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { Avatar } from "@/components/Avatar";
import { EditableAvatar } from "@/components/EditableAvatar";
import { PhotoGallery } from "@/components/PhotoGallery";
import { EditablePhotoGallery } from "@/components/EditablePhotoGallery";
import { PhotoViewer } from "@/components/PhotoViewer";
import { COVER_POSITION } from "@/api/gallery";
import { useWideLayout } from "@/hooks/useWideLayout";
import { TAG_TONES, type TagToneName } from "@/constants/tagTones";
import { OwnPhotos } from "@/components/OwnPhotos";
import { DesktopPersonCard } from "@/components/DesktopPersonCard";

// `namespace` looks up each value's display label under constants.<namespace>.<value>;
// values without a translation (freeform "Other" text a user typed in) just fall back
// to showing themselves as-is via i18next's defaultValue.
function TagRow({
  label,
  values,
  namespace,
}: {
  label: string;
  values: string[] | null | undefined;
  namespace: TagToneName;
}) {
  const { t } = useTranslation();
  if (!values || values.length === 0) return null;
  return (
    <View className="gap-2">
      <Text className="text-sm font-medium text-ink-700 dark:text-ink-200">{label}</Text>
      <View className="flex-row flex-wrap gap-2">
        {values.map((value) => (
          <View key={value} className={`rounded-full px-3 py-1.5 dark:bg-ink-700 ${TAG_TONES[namespace].bg}`}>
            <Text className={`text-xs font-medium dark:text-ink-50 ${TAG_TONES[namespace].text}`}>
              {t(`constants.${namespace}.${value}`, { defaultValue: value })}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <View className="gap-4 rounded-2xl bg-white dark:bg-ink-800 p-4">{children}</View>;
}

type ProfileViewProps = {
  profile: Tables<"profiles"> | null | undefined;
  connectionTypes: ConnectionType[] | undefined;
  originCountries: string[] | undefined;
  fallbackName?: string;
  verificationStatus?: string | null;
  /** Only set on the signed-in user's own profile -- enables the tap-to-change avatar. */
  ownUserId?: string;
  /** Desktop web only: the screen's actions (Message, Pass / Like, Report, Edit
   *  profile...), shown under the profile card in the left column. On a phone the
   *  screen lays them out itself, below the whole profile. */
  sideActions?: ReactNode;
};

export function ProfileView({
  profile,
  connectionTypes,
  originCountries,
  fallbackName,
  verificationStatus,
  ownUserId,
  sideActions,
}: ProfileViewProps) {
  const { t } = useTranslation();
  const age = profile?.birthdate ? calculateAge(profile.birthdate) : undefined;
  const location = [profile?.city, profile?.state, profile?.country].filter(Boolean).join(", ");
  const nameLabel = profile?.display_name || fallbackName || t("profile.addYourName");
  const photosUserId = ownUserId ?? profile?.id;
  const { data: photos } = useProfilePhotos(photosUserId);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const avatarUrl = profile?.avatar_url;
  const wide = useWideLayout();
  const cover = photos?.[0]?.position === COVER_POSITION ? photos[0].url : null;

  const avatar = (
    <>
      {ownUserId ? (
        <EditableAvatar userId={ownUserId} uri={profile?.avatar_url} name={nameLabel} size={88} />
      ) : avatarUrl ? (
        // Someone else's profile picture opens full-screen, like their gallery
        // photos. (Your own opens the change-photo options instead.)
        <Pressable
          accessibilityRole="imagebutton"
          accessibilityLabel={t("gallery.viewProfilePicture")}
          onPress={() => setAvatarOpen(true)}
        >
          <Avatar uri={avatarUrl} name={nameLabel} size={88} />
        </Pressable>
      ) : (
        <Avatar uri={avatarUrl} name={nameLabel} size={88} />
      )}
      {!ownUserId && avatarUrl ? (
        <PhotoViewer
          uris={[avatarUrl]}
          index={avatarOpen ? 0 : null}
          onChangeIndex={() => {}}
          onClose={() => setAvatarOpen(false)}
        />
      ) : null}
    </>
  );

  const identity = (
    <>
      <View className="items-center gap-1">
        <View className="flex-row items-center gap-2">
          <Text className="font-display text-2xl text-ink-900 dark:text-ink-50">{nameLabel}</Text>
          <VerifiedBadge status={verificationStatus} />
        </View>
        <Text className="text-sm text-ink-400 dark:text-ink-300">
          {[age ? `${age}` : null, location || null].filter(Boolean).join(" · ")}
        </Text>
        {profile?.occupation ? (
          <Text className="text-sm text-ink-700 dark:text-ink-200">{profile.occupation}</Text>
        ) : null}
      </View>
    </>
  );

  const about = (
    <>
      {profile?.bio ? (
        <Text className="text-center text-base text-ink-700 dark:text-ink-200">{profile.bio}</Text>
      ) : null}

      {connectionTypes && connectionTypes.length > 0 ? (
        <View className="flex-row flex-wrap justify-center gap-2">
          {connectionTypes.map((type) => (
            <View key={type} className="rounded-full bg-primary-100 px-3 py-1.5">
              <Text className="text-xs font-medium text-primary-600">{t(`constants.connectionTypes.${type}`)}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </>
  );

  // Your own, on desktop web: the profile picture picker sits before the gallery
  // (OwnPhotos), since the card on the left no longer has one. A phone keeps it at
  // the top of the profile card.
  const gallery = ownUserId ? (
    <Card>
      {wide ? (
        <OwnPhotos userId={ownUserId} avatarUrl={avatarUrl} name={nameLabel} photos={photos} />
      ) : (
        <EditablePhotoGallery userId={ownUserId} photos={photos} />
      )}
    </Card>
  ) : photos && photos.length > 0 ? (
    <Card>
      <PhotoGallery photos={photos} grid={wide} />
    </Card>
  ) : null;

  const details = (
    <>
      {profile?.languages?.length || profile?.interests?.length || profile?.hobbies?.length ? (
        <Card>
          <TagRow label={t("profile.languages")} values={profile?.languages} namespace="languages" />
          <TagRow label={t("profile.interests")} values={profile?.interests} namespace="interests" />
          <TagRow label={t("profile.hobbies")} values={profile?.hobbies} namespace="hobbies" />
        </Card>
      ) : null}

      {profile?.travel_style?.length || originCountries?.length ? (
        <Card>
          <TagRow label={t("profile.travelStyle")} values={profile?.travel_style} namespace="travelStyles" />
          <TagRow label={t("profile.originCountries")} values={originCountries} namespace="originCountries" />
        </Card>
      ) : null}
    </>
  );

  // Desktop web: on the left the same card as on Discover (DesktopPersonCard) and
  // the screen's actions; on the right the bio, the details, then the photos.
  if (wide) {
    return (
      <View className="flex-row items-start gap-6">
        <View className="w-[360px] gap-4">
          <View style={{ height: 450 }}>
            <DesktopPersonCard
              person={{
                displayName: nameLabel,
                avatarUrl: avatarUrl ?? null,
                birthdate: profile?.birthdate ?? null,
                city: profile?.city ?? null,
                state: profile?.state ?? null,
                occupation: profile?.occupation ?? null,
                connectionTypes: connectionTypes ?? [],
                coverPhotoUrl: cover,
              }}
              verificationStatus={verificationStatus}
              avatar={
                ownUserId ? (
                  <Avatar uri={avatarUrl} name={nameLabel} size={44} fallbackClassName="bg-white/30" />
                ) : avatarUrl ? (
                  <Pressable
                    accessibilityRole="imagebutton"
                    accessibilityLabel={t("gallery.viewProfilePicture")}
                    onPress={() => setAvatarOpen(true)}
                  >
                    <Avatar uri={avatarUrl} name={nameLabel} size={44} fallbackClassName="bg-white/30" />
                  </Pressable>
                ) : (
                  <Avatar uri={avatarUrl} name={nameLabel} size={44} fallbackClassName="bg-white/30" />
                )
              }
            />
          </View>
          {!ownUserId && avatarUrl ? (
            <PhotoViewer
              uris={[avatarUrl]}
              index={avatarOpen ? 0 : null}
              onChangeIndex={() => {}}
              onClose={() => setAvatarOpen(false)}
            />
          ) : null}
          {sideActions}
        </View>
        <View className="max-w-[560px] flex-1 gap-4">
          {/* Titled like the tag sections below (TagRow's label); the text one step up
              from the pills', which at the same size read smaller as a paragraph. */}
          {profile?.bio ? (
            <Card>
              <View className="gap-2">
                <Text className="text-sm font-medium text-ink-700 dark:text-ink-200">{t("profile.aboutMe")}</Text>
                <Text className="text-sm text-ink-700 dark:text-ink-200">{profile.bio}</Text>
              </View>
            </Card>
          ) : null}
          {details}
          {gallery}
        </View>
      </View>
    );
  }

  return (
    <View className="gap-4">
      <Card>
        <View className="items-center gap-3">
          {avatar}
          {identity}
        </View>
        {about}
      </Card>
      {gallery}
      {details}
    </View>
  );
}
