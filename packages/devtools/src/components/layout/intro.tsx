import { BackgroundBeams } from "@/components/ui/shadcn-io/background-beams";

export const Intro = () => {
  return (
    <>
      <BackgroundBeams className="absolute inset-0" />
      <div className="relative z-10 flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-foreground mb-2">
            Welcome to Skybridge Emulator
          </h1>
          <p className="text-sm text-muted-foreground">
            Choose a tool from the sidebar to begin
          </p>
        </div>
      </div>
    </>
  );
};
