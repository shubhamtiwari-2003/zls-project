import { preload } from "react-dom";
import { getImageProps, type StaticImageData } from "next/image";

/*
  One picture with a separate phone version (e.g. banners). Uses <picture>,
  so the browser downloads only the version for its screen. Two <Image>s
  hidden with CSS would download both, and with `priority` both are
  preloaded.

  `priority` (the main image at the top of a page): the right version is
  preloaded in <head> and fetched first (fetchpriority=high), so the browser
  starts it before the page's JavaScript and CSS have loaded.

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

const PHONE = "(max-width: 639px)";
const LARGER = "(min-width: 640px)";

export function ResponsiveImage({ desktop, mobile, alt, priority = false, className = "", sizes = "100vw" }: Props) {
  const common = { alt, fill: true, sizes };
  const { props: desktopProps } = getImageProps({ ...common, src: desktop });
  const { props: mobileProps } = mobile ? getImageProps({ ...common, src: mobile }) : { props: null };

  if (priority) {
    const hint = (props: typeof desktopProps, media?: string) =>
      preload(props.src, {
        as: "image",
        fetchPriority: "high",
        imageSrcSet: props.srcSet,
        imageSizes: props.sizes,
        ...(media ? { media } : {}),
      });

    if (mobileProps) {
      hint(mobileProps, PHONE);
      hint(desktopProps, LARGER);
    } else {
      hint(desktopProps);
    }
  }

  const img = mobileProps ?? desktopProps;

  return (
    <picture>
      {mobileProps && <source media={LARGER} srcSet={desktopProps.srcSet} sizes={desktopProps.sizes} />}
      {/* eslint-disable-next-line jsx-a11y/alt-text -- props come from getImageProps (alt included) */}
      <img
        {...img}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        className={className}
      />
    </picture>
  );
}
