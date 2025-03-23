"use client";

import { clsx } from "clsx";
import { useRouter } from "next/navigation";
import { LinkWithChannel } from "../atoms/LinkWithChannel";
import { type ProductListItemFragment, type VariantDetailsFragment } from "@/gql/graphql";
import { getHrefForVariant } from "@/lib/utils";
import { useEffect } from "react";

export function VariantSelector({
	variants,
	product,
	selectedVariant,
	channel,
}: {
	variants: readonly VariantDetailsFragment[];
	product: ProductListItemFragment;
	selectedVariant?: VariantDetailsFragment;
	channel: string;
}) {
	const router = useRouter();
	
	// Use client-side navigation instead of server-side redirect
	useEffect(() => {
		if (!selectedVariant && variants.length === 1 && variants[0]?.quantityAvailable) {
			router.push("/" + channel + getHrefForVariant({ productSlug: product.slug, variantId: variants[0].id }));
		}
	}, [selectedVariant, variants, product.slug, channel, router]);

	// If there's only one variant, don't render the selector
	if (variants.length <= 1) {
		return null;
	}

	return (
		<fieldset className="my-4" role="radiogroup" data-testid="VariantSelector">
			<legend className="sr-only">Variants</legend>
			<div className="flex flex-wrap gap-3">
				{variants.map((variant) => {
					const isDisabled = !variant.quantityAvailable;
					const isCurrentVariant = selectedVariant?.id === variant.id;
					return (
						<LinkWithChannel
							key={variant.id}
							prefetch={true}
							scroll={false}
							href={
								isDisabled ? "#" : getHrefForVariant({ productSlug: product.slug, variantId: variant.id })
							}
							className={clsx(
								isCurrentVariant
									? "border-transparent bg-amber-700 text-white hover:bg-amber-600"
									: "border-amber-800/30 bg-[#241505] text-amber-300 hover:bg-[#35200a]",
								"relative flex min-w-[5ch] items-center justify-center overflow-hidden text-ellipsis whitespace-nowrap rounded border p-3 text-center text-sm font-semibold focus-within:outline focus-within:outline-2 aria-disabled:cursor-not-allowed aria-disabled:bg-neutral-100 aria-disabled:text-neutral-800 aria-disabled:opacity-50",
								isDisabled && "pointer-events-none",
							)}
							role="radio"
							tabIndex={isDisabled ? -1 : undefined}
							aria-checked={isCurrentVariant}
							aria-disabled={isDisabled}
						>
							{variant.name}
						</LinkWithChannel>
					);
				})}
			</div>
		</fieldset>
	);
}
