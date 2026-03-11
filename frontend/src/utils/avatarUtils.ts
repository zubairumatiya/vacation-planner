import profileIcon from "../assets/icons/profile.svg";

const avatarFiles = import.meta.glob("../assets/avatars/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

const avatarMap: Record<string, string> = {};
for (const [path, src] of Object.entries(avatarFiles)) {
  const filename = path.split("/").pop()!;
  avatarMap[filename] = src;
}

export function getAvatarSrc(filename: string | null | undefined): string {
  if (filename && avatarMap[filename]) {
    return avatarMap[filename];
  }
  return profileIcon;
}
