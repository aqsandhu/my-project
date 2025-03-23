"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
	productId: string;
	variantId: string;
	disabled?: boolean;
}

export function AddButton({ productId, variantId, disabled }: Props) {
	const router = useRouter();
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setLoading(true);

		try {
			const form = event.currentTarget;
			const formData = new FormData(form);
			const quantity = Number(formData.get("quantity") || 1);

			const response = await fetch("/api/checkout/lines/add", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					productVariantId: variantId,
					quantity,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				console.error("Error adding item to cart:", errorData);
				setLoading(false);
				return;
			}

			// Revalidate cart page to show updated cart
			router.refresh();
			// Optionally navigate to cart page
			// router.push("/cart");
		} catch (error) {
			console.error("Error adding item to cart:", error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<form onSubmit={handleSubmit} className="mt-4">
			<input type="hidden" name="productId" value={productId} />
			<input type="hidden" name="variantId" value={variantId} />
			<input
				type="number"
				name="quantity"
				min="1"
				defaultValue="1"
				className="w-16 rounded border border-neutral-300 px-4 py-2 text-sm"
			/>
			<button
				type="submit"
				disabled={disabled || loading}
				className="ml-2 rounded bg-neutral-800 px-4 py-2 text-neutral-200 hover:bg-neutral-700 disabled:cursor-not-allowed disabled:bg-neutral-400"
			>
				{loading ? "Adding..." : "Add to Cart"}
			</button>
		</form>
	);
} 