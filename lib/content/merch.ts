import { merchProducts } from "@/content/merch";
import type { Color } from "@/types/content";
import type { MerchProduct, MerchVariant } from "@/types/merch";

function uniqueColors(colors: readonly Color[]): Color[] {
  return colors.filter(
    (color, index) => colors.findIndex(({ id }) => id === color.id) === index,
  );
}

export async function getMerchProducts(): Promise<readonly MerchProduct[]> {
  return merchProducts;
}

export async function getMerchProductBySlug(slug: string): Promise<MerchProduct | null> {
  return merchProducts.find((product) => product.slug === slug) ?? null;
}

export async function getFeaturedMerchProducts(): Promise<readonly MerchProduct[]> {
  return (await getMerchProducts()).filter((product) => product.featured);
}

export function getAvailableBaseColors(product: MerchProduct): Color[] {
  return uniqueColors(product.variants.map((variant) => variant.baseColor));
}

export function getValidPrintColors(product: MerchProduct, baseColorId: string): Color[] {
  return uniqueColors(
    product.variants
      .filter((variant) => variant.baseColor.id === baseColorId)
      .map((variant) => variant.printColor),
  );
}

export function resolveMerchVariant(
  product: MerchProduct,
  baseColorId: string,
  printColorId: string,
): MerchVariant | null {
  return (
    product.variants.find(
      (variant) =>
        variant.baseColor.id === baseColorId && variant.printColor.id === printColorId,
    ) ?? null
  );
}

export function selectVariantForBase(
  product: MerchProduct,
  baseColorId: string,
  previousPrintColorId?: string,
): MerchVariant | null {
  const validVariants = product.variants.filter(
    (variant) => variant.baseColor.id === baseColorId,
  );

  if (!validVariants.length) {
    return null;
  }

  return (
    validVariants.find((variant) => variant.printColor.id === previousPrintColorId) ??
    validVariants[0]
  );
}
