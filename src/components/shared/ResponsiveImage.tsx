import { getImageProps, type StaticImageData } from "next/image";

/*
  One picture with a separate phone version (e.g. banners). Uses <picture>,
  so the browser downloads only the version for its screen. Two <Image>s
  hidden with CSS would download both, and with `priority` both are
  preloaded.

  Fills its (positioned) parent, like <Image fill>.
*/

type Source = string | StaticImageData;

interface Props {
  desktop: Source;
  /** Shown below the `sm` breakpoint (640px). Optional. */
  mobile?: Source | null;
  alt: string;
  priority?: boolean;
  className?: string;
  sizes?: string;
}

export function ResponsiveImage({ desktop, mobile, alt, priority = false, className = "", sizes = "100vw" }: Props) {
  const common = { alt, fill: true, sizes, priority };
  const { props: desktopProps } = getImageProps({ ...common, src: desktop });
  const { props: mobileProps } = mobile ? getImageProps({ ...common, src: mobile }) : { props: null };

  return (
    <picture>
      {mobileProps && <source media="(min-width: 640px)" srcSet={desktopProps.srcSet} sizes={desktopProps.sizes} />}
      {/* eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text -- props come from getImageProps (alt included) */}
      <img {...(mobileProps ?? desktopProps)} className={className} />
    </picture>
  );
}
