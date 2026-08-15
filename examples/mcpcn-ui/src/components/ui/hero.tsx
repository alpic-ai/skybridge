"use client";

import { createContext, createElement, useContext } from "react";
import type { ComponentProps, ImgHTMLAttributes, ReactNode } from "react";

import { Button } from "@/components/ui/button.js";
import { cn } from "@/lib/utils.js";

const BlockImage = (props: ImgHTMLAttributes<HTMLImageElement>) =>
  createElement("img", props);

export interface HeroLogo {
  alt?: string;
  text?: string;
  url?: string;
  urlLight?: string;
}

export interface TechLogo {
  alt?: string;
  name?: string;
  url?: string;
}

export interface HeroButton {
  icon?: ReactNode;
  label?: string;
}

interface HeroData {
  logo1?: HeroLogo;
  logo2?: HeroLogo;
  logoSeparator?: string;
  primaryButton?: HeroButton;
  secondaryButton?: HeroButton;
  subtitle?: string;
  techLogos?: TechLogo[];
  techLogosLabel?: string;
  title?: string;
}

interface HeroContextValue {
  data: HeroData;
  onPrimaryClick?: () => void;
  onSecondaryClick?: () => void;
}

const HeroContext = createContext<HeroContextValue | null>(null);

export const useHero = () => {
  const context = useContext(HeroContext);

  if (!context) {
    throw new Error("Hero components must be used within Hero");
  }

  return context;
};

const DEFAULT_HERO: HeroData = {
  logo1: { alt: "mcpcn", text: "mcpcn" },
  primaryButton: { label: "Get Started" },
  secondaryButton: { label: "GitHub" },
  subtitle:
    "Create beautiful chat experiences with our comprehensive component library designed for agentic applications.",
  title: "Build beautiful MCP App experiences with mcpcn",
};

export interface HeroProps extends ComponentProps<"section"> {
  actions?: {
    onPrimaryClick?: () => void;
    onSecondaryClick?: () => void;
  };
  data?: HeroData;
}

const Logo = ({ logo }: { logo: HeroLogo }) => {
  if (logo.url && logo.urlLight) {
    return (
      <>
        <BlockImage
          alt={logo.alt ?? "Logo"}
          className="h-8 w-auto object-contain dark:hidden sm:h-10"
          src={logo.url}
        />
        <BlockImage
          alt={logo.alt ?? "Logo"}
          className="hidden h-8 w-auto object-contain dark:block sm:h-10"
          src={logo.urlLight}
        />
      </>
    );
  }

  if (logo.url) {
    return (
      <BlockImage
        alt={logo.alt ?? "Logo"}
        className="h-16 w-auto object-contain sm:h-20"
        src={logo.url}
      />
    );
  }

  if (logo.text) {
    return (
      <div className="flex size-16 items-center justify-center rounded-xl border bg-background p-3 sm:size-20">
        <span className="font-bold text-foreground text-xl tracking-tight sm:text-2xl">
          {logo.text}
        </span>
      </div>
    );
  }

  return null;
};

export const HeroLogos = ({
  children,
  className,
  ...props
}: ComponentProps<"div">) => {
  const { data } = useHero();
  const { logo1 } = data;
  const { logo2 } = data;
  const hasLogo1 = Boolean(logo1?.url || logo1?.text);
  const hasLogo2 = Boolean(logo2?.url || logo2?.text);

  if (!(children || hasLogo1 || hasLogo2)) {
    return null;
  }

  return (
    <div
      className={cn(
        "mb-8 flex items-center justify-center gap-3 sm:mb-10 sm:gap-4",
        className
      )}
      {...props}
    >
      {children ?? (
        <>
          {hasLogo1 && logo1 && <Logo logo={logo1} />}
          {hasLogo1 && hasLogo2 && (
            <span className="font-medium text-lg text-muted-foreground sm:text-xl">
              {data.logoSeparator ?? "x"}
            </span>
          )}
          {hasLogo2 && logo2 && <Logo logo={logo2} />}
        </>
      )}
    </div>
  );
};

export const HeroTitle = ({
  children,
  className,
  ...props
}: ComponentProps<"h1">) => {
  const { data } = useHero();

  if (!(children || data.title)) {
    return null;
  }

  return (
    <h1
      className={cn(
        "mb-4 max-w-4xl text-center font-bold text-3xl text-foreground sm:mb-6 sm:text-4xl lg:text-5xl",
        className
      )}
      {...props}
    >
      {children ?? data.title}
    </h1>
  );
};

export const HeroDescription = ({
  children,
  className,
  ...props
}: ComponentProps<"p">) => {
  const { data } = useHero();

  if (!(children || data.subtitle)) {
    return null;
  }

  return (
    <p
      className={cn(
        "mb-8 max-w-2xl text-center text-base text-muted-foreground sm:mb-10 sm:text-lg",
        className
      )}
      {...props}
    >
      {children ?? data.subtitle}
    </p>
  );
};

export const HeroActions = ({
  children,
  className,
  ...props
}: ComponentProps<"div">) => {
  const { data, onPrimaryClick, onSecondaryClick } = useHero();
  const primary = data.primaryButton;
  const secondary = data.secondaryButton;
  const hasPrimary = Boolean(primary?.label || primary?.icon);
  const hasSecondary = Boolean(secondary?.label || secondary?.icon);

  if (!(children || hasPrimary || hasSecondary)) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4",
        className
      )}
      data-apps-sdk-actions=""
      {...props}
    >
      {children ?? (
        <>
          {hasPrimary && primary && (
            <Button
              className="min-w-[140px]"
              onClick={onPrimaryClick}
              size="lg"
              variant="outline"
            >
              {primary.icon && <span className="mr-2">{primary.icon}</span>}
              {primary.label}
            </Button>
          )}
          {hasSecondary && secondary && (
            <Button
              className="min-w-[140px]"
              onClick={onSecondaryClick}
              size="lg"
            >
              {secondary.icon && <span className="mr-2">{secondary.icon}</span>}
              {secondary.label}
            </Button>
          )}
        </>
      )}
    </div>
  );
};

export const HeroTechLogos = ({
  children,
  className,
  ...props
}: ComponentProps<"div">) => {
  const { data } = useHero();
  const logos = data.techLogos ?? [];

  if (!(children || logos.length > 0)) {
    return null;
  }

  return (
    <div
      className={cn(
        "mt-12 flex w-full max-w-2xl flex-col items-center border-t pt-8 sm:mt-16 sm:pt-10",
        className
      )}
      {...props}
    >
      {children ?? (
        <>
          {data.techLogosLabel && (
            <p className="mb-4 text-muted-foreground text-sm">
              {data.techLogosLabel}
            </p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-4">
            {logos.map((logo) => (
              <div
                className="flex size-12 items-center justify-center rounded-lg border bg-background p-2 sm:size-14"
                key={logo.name ?? logo.url ?? logo.alt}
                title={logo.name}
              >
                {logo.url && (
                  <BlockImage
                    alt={logo.alt ?? logo.name ?? "Tech logo"}
                    className="max-h-full max-w-full object-contain opacity-60 grayscale"
                    src={logo.url}
                  />
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export const HeroContent = ({
  children,
  className,
  ...props
}: ComponentProps<"div"> & { children: React.ReactNode }) => (
  <div
    className={cn(
      "flex flex-col items-center justify-center px-6 py-16 sm:px-8 sm:py-20 lg:px-12 lg:py-24",
      className
    )}
    {...props}
  >
    {children}
  </div>
);

const HeroRoot = ({
  actions,
  children,
  className,
  data,
  ...props
}: HeroProps & { children: React.ReactNode }) => {
  const context: HeroContextValue = {
    data: data ?? DEFAULT_HERO,
    onPrimaryClick: actions?.onPrimaryClick,
    onSecondaryClick: actions?.onSecondaryClick,
  };

  return (
    <HeroContext.Provider value={context}>
      <section
        className={cn("w-full rounded-xl border bg-card shadow-sm", className)}
        {...props}
      >
        {children}
      </section>
    </HeroContext.Provider>
  );
};

export const Hero = HeroRoot;
