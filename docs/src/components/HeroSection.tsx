import { GitHubStarButton } from "@/components/GitHubStarButton";
import { TrackedButton } from "@/components/TrackedButton";
import { useExtracted } from "next-intl";
import { Tilt_Warp } from "next/font/google";
import styles from "./LandingPage.module.css";

const tiltWarp = Tilt_Warp({
  subsets: ["latin"],
});

const EUFlag = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 767 512"
    role="img"
    aria-label="European flag"
    className={styles.euFlag}
  >
    <title>European flag</title>
    <path className="fill-[#233E90]" d="M766 1H1v510h765V1Z" />
    <path
      className="fill-yellow-400"
      d="m387 117-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm114 43-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm47 125-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm-321 0-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm283 125-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm-123 35-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm-123-35-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Zm0-250-35 25 13-41-35-26h43l14-41 14 41h43l-35 26 13 41-35-25Z"
    />
  </svg>
);

interface HeroSectionProps {
  title: React.ReactNode;
  subtitle: React.ReactNode;
  showEUFlag?: boolean;
  showGitHubStar?: boolean;
}

export function HeroSection({
  title,
  subtitle,
  showEUFlag = true,
  showGitHubStar = true,
}: HeroSectionProps) {
  const t = useExtracted();

  return (
    <section className={styles.hero} aria-labelledby="landing-title">
      <div className={styles.shell}>
        <div className={styles.heroIntro}>
          <div className={styles.heroHeading}>
            {showGitHubStar && <GitHubStarButton />}
            <h1 id="landing-title" className={`${styles.heroTitle} ${tiltWarp.className}`}>
              {title}
            </h1>
          </div>

          <div className={styles.heroDetails}>
            <p className={styles.heroSubtitle}>
              {subtitle}
              {showEUFlag && <EUFlag />}
            </p>
            <div className={styles.heroActions}>
              <TrackedButton
                href="https://app.rybbit.io/signup"
                eventName="signup"
                eventProps={{ location: "hero", button_text: "get started" }}
                className={styles.primaryButton}
              >
                {t("Start for $0")}
              </TrackedButton>
              <TrackedButton
                href="https://demo.rybbit.com/81"
                eventName="demo"
                target="_blank"
                rel="noopener noreferrer"
                eventProps={{ location: "hero", button_text: "Live demo" }}
                className={styles.secondaryButton}
              >
                {t("Live demo")}
              </TrackedButton>
            </div>
          </div>
        </div>

        <div className={styles.demoFrame}>
          <div className={styles.demoToolbar}>
            <span className={styles.demoStatus}>
              <span aria-hidden="true" />
              {t("Live demo")}
            </span>
            <span className={styles.demoAddress}>demo.rybbit.com / overview</span>
            <a href="https://demo.rybbit.com/81" target="_blank" rel="noopener noreferrer">
              {t("Live demo")}
              <span aria-hidden="true">↗</span>
            </a>
          </div>
          <div className={styles.demoViewport}>
            <iframe
              src="https://demo.rybbit.com/81/main"
              width="1300"
              height="750"
              className={styles.demoIframe}
              title="Rybbit Analytics Demo"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
