import type { HTMLAttributes } from "react";
import { useLayout } from "skybridge/web";
import { darkTheme, lightTheme } from "../design/tokens";
import { cx } from "../lib/cx";
import { viewFrame } from "./view-frame.css";

/**
 * ViewFrame: the top-level wrapper every view mounts inside. It activates the
 * design system by applying the active theme class (which sets the CSS
 * variables the color contract declares) and paints the base surface + font +
 * content color so descendants inherit from the DS instead of the host page.
 *
 * It follows the host theme via useLayout(). To lock the widget to one palette
 * (e.g. always light), drop useLayout and hardcode the theme class.
 *
 * Keep view entry files thin: render <ViewFrame> at the root and let this carry
 * the theme + base-style boilerplate.
 */
type ViewFrameProps = HTMLAttributes<HTMLDivElement>;

export function ViewFrame({ className, ...rest }: ViewFrameProps) {
  const { theme } = useLayout();
  const themeClass = theme === "dark" ? darkTheme : lightTheme;

  return <div {...rest} className={cx(themeClass, viewFrame, className)} />;
}
ViewFrame.displayName = "ViewFrame";
