import { createContext, useMemo } from "react";

export type BannerContext = {
  setBannerMsg: React.Dispatch<React.SetStateAction<string | null>>;
  bannerMsg: string | null;
};

export const BannerContext = createContext<BannerContext>({} as BannerContext);

export function BannerContextProvider({
  children,
  setBannerMsg,
  bannerMsg,
}: {
  children: React.ReactNode;
  setBannerMsg: React.Dispatch<React.SetStateAction<string | null>>;
  bannerMsg: string | null;
}) {
  const value = useMemo(
    () => ({
      bannerMsg,
      setBannerMsg,
    }),
    [setBannerMsg, bannerMsg]
  );
  return (
    <BannerContext.Provider value={value}>{children}</BannerContext.Provider>
  );
}
