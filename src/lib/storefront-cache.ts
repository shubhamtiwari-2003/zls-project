import "server-only";

import { unstable_cache } from "next/cache";

/*
  Server cache for public shop data (catalog, categories, settings,
  promotions). The same for every visitor, so pages skip the database most
  of the time.

  * Fresh for STOREFRONT_CACHE_SECONDS; after that the next visitor gets
    the cached copy while it refreshes in the background.
  * Saving in the admin clears it straight away (POST
    /api/admin/revalidate, called by refreshStorefront()).
  * Failures are never cached: loaders throw on errors, and the fallback is
    returned for this request only.

  Cart and checkout don't use this: prices, stock, coupons and shipping are
  always checked live when an order is placed.
*/

export const STOREFRONT_TAG = "storefront";
export const STOREFRONT_CACHE_SECONDS = 60;

export function storefrontCache<Args extends unknown[], Result>(
  name: string,
  load: (...args: Args) => Promise<Result>,
  fallback: () => Result
): (...args: Args) => Promise<Result> {
  const cached = unstable_cache(load, ["storefront", name], {
    revalidate: STOREFRONT_CACHE_SECONDS,
    tags: [STOREFRONT_TAG],
  });

  return async (...args: Args) => {
    try {
      return await cached(...args);
    } catch (error) {
      console.error(`Storefront data error (${name}):`, error);
      return fallback();
    }
  };
}
