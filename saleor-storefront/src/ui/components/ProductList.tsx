import { ProductElement } from "./ProductElement";
import { type ProductListItemFragment } from "@/gql/graphql";
import { memo } from "react";

// List of featured product IDs (in a real app, this could come from an API or CMS)
const FEATURED_PRODUCT_IDS = [
	// Set the first few products as featured
	"UHJvZHVjdDo3Mg==", // Example ID
	"UHJvZHVjdDo3NA==", // Example ID
];

// Define a type that ensures compatibility between components
type ProductWithRequiredFields = {
	id: string;
	name: string;
	slug: string;
	thumbnail?: {
		url: string;
		alt?: string | null;
	} | null;
	pricing?: {
		priceRange?: {
			start?: {
				gross: {
					amount: number;
					currency: string;
				};
			} | null;
		} | null;
	} | null;
	[key: string]: any; // Allow other fields
};

export const ProductList = memo(function ProductList({ 
	products,
	channel,
	title,
	showFeatured = true
}: { 
	products: readonly ProductListItemFragment[];
	channel: string;
	title?: string;
	showFeatured?: boolean;
}) {
	// Set top picks based on featured product IDs or the first two products
	const topPicks = showFeatured 
		? products.filter((product) => FEATURED_PRODUCT_IDS.includes(product.id))
		: [];
		
	// If no specific featured products, mark the first 2 as top picks
	if (showFeatured && topPicks.length === 0 && products.length > 0) {
		topPicks.push(products[0]);
		if (products.length > 1) {
			topPicks.push(products[1]);
		}
	}
	
	return (
		<div className="w-full">
			{title && (
				<div className="mb-6 flex justify-between items-center">
					<h2 className="text-2xl font-bold text-amber-800">{title}</h2>
					{products.length > 4 && (
						<a href={`/${channel}/categories/all`} className="text-amber-600 hover:text-amber-500 font-medium">
							Shop All →
						</a>
					)}
				</div>
			)}
			
			<ul
				role="list"
				data-testid="ProductList"
				className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
			>
				{products.map((product, index) => {
					// Check if this product is a top pick
					const isTopPick = topPicks.some(tp => tp.id === product.id);
					
					// Ensure product conforms to required structure
					const enhancedProduct = product as unknown as ProductWithRequiredFields;
					
					return (
						<ProductElement
							key={product.id}
							product={enhancedProduct}
							channel={channel}
							loading={index < 3 ? "eager" : "lazy"}
							isTopPick={isTopPick}
						/>
					);
				})}
			</ul>
		</div>
	);
});
