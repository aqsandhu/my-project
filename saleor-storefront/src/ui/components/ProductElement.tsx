"use client";

import { memo, useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import * as Checkout from "@/lib/checkoutClient";

// Cache for checkout IDs
const checkoutIdCache = new Map<string, string>();

interface CheckoutCreateResponse {
	data?: {
		checkoutCreate?: {
			checkout?: {
				id: string;
			};
			errors?: Array<{
				field: string;
				message: string;
			}>;
		};
	};
	errors?: Array<{
		message: string;
	}>;
}

// Define product interface to prevent type errors
interface ProductVariant {
	id: string;
	name: string;
	quantityAvailable?: number;
	pricing?: {
		price?: {
			gross: {
				amount: number;
				currency: string;
			};
		};
	};
}

interface ProductType {
	id: string;
	name: string;
	slug: string;
	thumbnail?: {
		url: string;
		alt?: string | null;
	} | null;
	images?: Array<{
		url: string;
		alt?: string | null;
	}> | null;
	variants?: ProductVariant[] | null;
	category?: {
		name: string;
	} | null;
	pricing?: {
		priceRange?: {
			start?: {
				gross: {
					amount: number;
					currency: string;
				};
				discount?: {
					amount: number;
				} | null;
				undiscounted?: {
					amount: number;
				} | null;
			} | null;
			stop?: {
				gross: {
					amount: number;
					currency: string;
				};
			} | null;
		} | null;
	} | null;
}

export const ProductElement = memo(function ProductElement({
	product,
	loading,
	channel,
	isTopPick = false,
}: { 
	product: ProductType; 
	loading: "eager" | "lazy"; 
	channel: string;
	isTopPick?: boolean;
}) {
	const [isAddingToCart, setIsAddingToCart] = useState(false);
	const [imageLoaded, setImageLoaded] = useState(false);
	const [currentImageIndex, setCurrentImageIndex] = useState(0);
	const [isHovered, setIsHovered] = useState(false);
	const mountedRef = useRef(true);
	const abortControllerRef = useRef<AbortController | null>(null);

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			mountedRef.current = false;
			if (abortControllerRef.current) {
				abortControllerRef.current.abort();
			}
		};
	}, []);

	const getCheckoutId = useCallback(async (channel: string): Promise<string> => {
		// Check cache first
		const cachedId = checkoutIdCache.get(channel);
		if (cachedId) {
			return cachedId;
		}

		// Get from cookies
		let checkoutId = Checkout.getIdFromCookies(channel);
		if (checkoutId) {
			checkoutIdCache.set(channel, checkoutId);
			return checkoutId;
		}
	
		// Create new checkout
		const controller = new AbortController();
		abortControllerRef.current = controller;

		try {
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_SALEOR_API_URL || 'http://localhost:8000/graphql/'}`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						query: `
							mutation CreateCheckout($channel: String!) {
								checkoutCreate(input: { channel: $channel }) {
									checkout {
										id
									}
									errors {
										field
										message
									}
								}
							}
						`,
						variables: {
							channel,
						},
					}),
					signal: controller.signal,
				}
			);

			if (!response.ok) {
				throw new Error("Failed to create checkout");
			}
		
			const result = await response.json() as CheckoutCreateResponse;
			
			// Check for GraphQL errors
			if (result.errors || result.data?.checkoutCreate?.errors?.length) {
				throw new Error("Failed to create checkout: " + JSON.stringify(result.errors || result.data?.checkoutCreate?.errors));
			}

			const newCheckoutId = result.data?.checkoutCreate?.checkout?.id;
		
			if (newCheckoutId) {
				Checkout.saveIdToCookie(channel, newCheckoutId);
				checkoutIdCache.set(channel, newCheckoutId);
				return newCheckoutId;
			}

			throw new Error("Failed to create checkout");
		} catch (error) {
			if (error instanceof Error && error.name === 'AbortError') {
				console.log('Fetch aborted');
				throw error;
			}
			console.error("Error creating checkout:", error);
			throw error;
		}
	}, []);

	const handleAddToCart = useCallback(async (e?: React.MouseEvent | React.FormEvent) => {
		if (e) {
			e.preventDefault();
		}
		
		if (isAddingToCart) return;
		setIsAddingToCart(true);
		
		try {
			// Get existing checkout ID or create new one
			const checkoutId = await getCheckoutId(channel);
			
			// Find the variant - use first variant if available
			const variant = product.variants?.[0];
			if (!variant) {
				console.error("No variant available for this product");
				throw new Error("No variant available for this product");
			}
			
			console.log("Adding to cart:", {
				checkoutId,
				productId: product.id,
				variantId: variant.id,
				channel
			});
			
			// Use the API endpoint to add to cart
			const response = await fetch('/api/checkout/lines/add', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					checkoutId,
					productId: product.id,
					variantId: variant.id,
					quantity: 1,
					channel
				}),
			});
			
			if (!response.ok) {
				const errorJson = await response.json() as { error?: string };
				const errorMessage = errorJson.error || "Failed to add item to cart";
				throw new Error(errorMessage);
			}
			
			// Parse the successful response
			await response.json();
			
			// Only update UI and trigger events if component is still mounted
			if (mountedRef.current) {
				// Show success feedback
				const successToast = document.createElement('div');
				successToast.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50 animate-fade-in-out';
				successToast.textContent = `${product.name} added to cart!`;
				document.body.appendChild(successToast);
				setTimeout(() => {
					successToast.remove();
				}, 3000);
			
				// Trigger cart refresh for other components
				const cartUpdateEvent = new CustomEvent('cart:updated', {
					detail: {
						productId: product.id,
						productName: product.name
					}
				});
				window.dispatchEvent(cartUpdateEvent);
				console.log('Product added to cart successfully');
			}
			
		} catch (error) {
			console.error("Error adding item to cart:", error);
			
			// Show error toast if component is mounted
			if (mountedRef.current) {
				const errorToast = document.createElement('div');
				errorToast.className = 'fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded shadow-lg z-50 animate-fade-in-out';
				errorToast.textContent = `Failed to add ${product.name} to cart`;
				document.body.appendChild(errorToast);
				setTimeout(() => {
					errorToast.remove();
				}, 3000);
			}
		} finally {
			if (mountedRef.current) {
				setIsAddingToCart(false);
			}
		}
	}, [isAddingToCart, product, channel, getCheckoutId]);

	const handleImageLoad = useCallback(() => {
		setImageLoaded(true);
	}, []);

	// Function to add to wishlist
	const handleAddToWishlist = useCallback((e: React.MouseEvent) => {
		e.preventDefault();
		e.stopPropagation();
		
		// Show success toast
		const successToast = document.createElement('div');
		successToast.className = 'fixed top-4 right-4 bg-amber-600 text-white px-4 py-2 rounded shadow-lg z-50 animate-fade-in-out';
		successToast.textContent = `${product.name} added to wishlist!`;
		document.body.appendChild(successToast);
		setTimeout(() => {
			successToast.remove();
		}, 3000);
		
		// In a real implementation, you would call an API to add to the wishlist
		console.log('Added to wishlist:', product.name);
	}, [product]);

	// Get product images, handling null cases
	const productImages = [
		product?.thumbnail?.url || '/placeholder.png',
		...((product?.images || [])
			.filter(img => img?.url)
			.map(img => img?.url) || [])
	].filter(Boolean);

	// If no additional images, just use the thumbnail twice
	if (productImages.length === 1) {
		productImages.push(productImages[0]);
	}

	// Cycle through images on hover
	useEffect(() => {
		if (!isHovered || productImages.length <= 1) return;
		
		const interval = setInterval(() => {
			setCurrentImageIndex((prev) => (prev + 1) % productImages.length);
		}, 1500);
		
		return () => clearInterval(interval);
	}, [isHovered, productImages.length]);

	// Check if the product is on sale and handle all possible null values
	const priceStart = product?.pricing?.priceRange?.start;
	const discount = priceStart?.discount?.amount; 
	const isOnSale = !!discount && discount > 0;
	
	const regularPrice = isOnSale 
		? priceStart?.undiscounted?.amount || 0
		: priceStart?.gross?.amount || 0;
		
	const salePrice = isOnSale 
		? priceStart?.gross?.amount || 0 
		: null;
		
	const currency = priceStart?.gross?.currency || '';

	return (
		<div 
			className="group relative flex flex-col overflow-hidden rounded border border-neutral-200 hover:border-amber-400 transition-all duration-200 bg-white shadow-sm" 
			data-testid="ProductElement"
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => {
				setIsHovered(false);
				setCurrentImageIndex(0);
			}}
		>
			{/* TOP PICK Badge */}
			{isTopPick && (
				<div className="absolute top-0 left-0 z-10 bg-amber-600 text-white px-3 py-1 text-sm font-bold">
					TOP PICK
				</div>
			)}
			
			{/* Wishlist button */}
			<button 
				onClick={handleAddToWishlist}
				className="absolute top-2 right-2 z-10 bg-white/80 hover:bg-white p-1 rounded-full shadow-md transition-all duration-200"
				aria-label="Add to wishlist"
			>
				<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-700 hover:text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
					<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
				</svg>
			</button>
			
			<Link href={`/${channel}/products/${product.slug}`} className="flex-grow">
				<div className="aspect-h-1 aspect-w-1 w-full overflow-hidden bg-gray-100 lg:aspect-none group-hover:opacity-90 lg:h-80 relative">
					{!imageLoaded && (
						<div className="absolute inset-0 flex items-center justify-center bg-gray-100">
							<div className="animate-pulse rounded-md bg-gray-200 h-full w-full" />
						</div>
					)}
					<Image
						src={productImages[currentImageIndex]}
						alt={product.thumbnail?.alt || product.name}
						className={`h-full w-full object-contain object-center lg:h-full lg:w-full transition-opacity duration-300 ${
							imageLoaded ? 'opacity-100' : 'opacity-0'
						}`}
						loading={loading}
						width={400}
						height={400}
						onLoad={handleImageLoad}
					/>
					
					{/* Price display with sale indicator */}
					<div className="absolute bottom-0 right-0 flex flex-col items-end">
						{isOnSale && (
							<div className="bg-red-600 text-white px-2 py-1 text-sm font-bold mb-1">
								SALE
							</div>
						)}
					</div>
				</div>
				
				<div className="p-4 flex flex-col justify-between">
					<div>
						<h3 className="text-base font-semibold text-amber-700 hover:text-amber-500">{product.name}</h3>
						<p className="mt-1 text-sm text-gray-500" data-testid="ProductElement_Category">
							{product.category?.name}
						</p>
						
						{/* Price display */}
						<div className="mt-2 flex items-center">
							{isOnSale ? (
								<>
									<span className="text-lg font-bold text-red-600">${salePrice} {currency}</span>
									<span className="ml-2 text-sm text-gray-500 line-through">${regularPrice} {currency}</span>
								</>
							) : (
								<span className="text-lg font-bold text-amber-700">${regularPrice} {currency}</span>
							)}
						</div>
					</div>
				</div>
			</Link>
			
			<div className="p-4 flex gap-2 mt-auto">
				<Link
					href={`/${channel}/products/${product.slug}`}
					className="flex-1 text-center text-sm px-3 py-1.5 bg-amber-800 hover:bg-amber-700 text-white rounded transition-colors"
				>
					View Details
				</Link>
				<button 
					className="flex-1 text-sm px-3 py-1.5 bg-amber-700 hover:bg-amber-600 text-white rounded transition-colors flex items-center justify-center gap-1 relative overflow-hidden"
					onClick={handleAddToCart}
					disabled={isAddingToCart}
					aria-label={isAddingToCart ? "Adding to cart..." : "Add to cart"}
				>
					{isAddingToCart ? (
						<>
							<svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
								<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
								<path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
							</svg>
							<span>Adding...</span>
						</>
					) : (
						<>
							<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
							</svg>
							<span>Add to Cart</span>
						</>
					)}
					{isAddingToCart && (
						<span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shine" />
					)}
				</button>
			</div>
		</div>
	);
});
