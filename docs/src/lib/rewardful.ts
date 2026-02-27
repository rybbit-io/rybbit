export function appendReferral(href: string): string {
  if (!href.includes("app.rybbit.io")) return href;
  try {
    const referral = (window as any).Rewardful?.referral;
    if (!referral) return href;
    const url = new URL(href);
    if (!url.searchParams.has("referral")) {
      url.searchParams.set("referral", referral);
    }
    return url.toString();
  } catch {
    return href;
  }
}
