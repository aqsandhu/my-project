"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import clsx from "clsx";
import * as Checkout from "@/lib/checkoutClient";
import { LinkWithChannel } from "@/ui/atoms/LinkWithChannel";
import Cookies from "js-cookie";

// Define types for the checkout data
interface CheckoutData {
	id: string;
	lines: Array<{
		id: string;
		quantity: number;
		variant: {
			id: string;
			name: string;
			product: {
				id: string;
				name: string;
				thumbnail?: {
					url: string;
					alt?: string;
				};
			};
		};
	}>;
	totalPrice: {
		gross: {
			amount: number;
			currency: string;
		};
	};
}

// Define types for API responses
interface CheckoutQueryResponse {
	data?: {
		checkout?: CheckoutData;
	};
	errors?: Array<{ message: string }>;
}

// Cache the checkout data
let cachedCheckout: CheckoutData | null = null;
let lastFetchTime = 0;

export const CartNavItem = ({ channel }: { channel: string }) => {
	const [isDropdownOpen, setIsDropdownOpen] = useState(false);
	const [checkout, setCheckout] = useState<CheckoutData | null>(cachedCheckout);
	const [loading, setLoading] = useState(!cachedCheckout);
	const [cartAnimation, setCartAnimation] = useState(false);
	const [addedItemName, setAddedItemName] = useState("");
	const dropdownRef = useRef<HTMLDivElement>(null);
	const buttonRef = useRef<HTMLButtonElement>(null);
	
	// Handle clicks outside the dropdown
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				isDropdownOpen && 
				dropdownRef.current && 
				buttonRef.current &&
				!dropdownRef.current.contains(event.target as Node) &&
				!buttonRef.current.contains(event.target as Node)
			) {
				setIsDropdownOpen(false);
			}
		};

		// Add the event listener
		document.addEventListener('mousedown', handleClickOutside);
		
		// Cleanup
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, [isDropdownOpen]);
	
	// Fetch checkout data when component mounts or dropdown is opened
	const fetchCheckout = useCallback(async (force = false) => {
		const checkoutId = Checkout.getIdFromCookies(channel);
		
		if (!checkoutId) {
			setLoading(false);
			setCheckout(null);
			cachedCheckout = null;
			return;
		}
		
		// Use cache if available and recent (<30 seconds old) unless force refresh
		if (!force && cachedCheckout && Date.now() - lastFetchTime < 30000) {
			setCheckout(cachedCheckout);
			setLoading(false);
			return;
		}
		
		setLoading(true);
		
		try {
			// Direct GraphQL query to fetch checkout data
			const response = await fetch(`${process.env.NEXT_PUBLIC_SALEOR_API_URL || 'http://localhost:8000/graphql/'}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					query: `
						query GetCheckout($checkoutId: ID!) {
							checkout(id: $checkoutId) {
								id
								lines {
									id
									quantity
									variant {
										id
										name
										product {
											id
											name
											thumbnail {
												url
												alt
											}
										}
									}
								}
								totalPrice {
									gross {
										amount
										currency
									}
								}
							}
						}
					`,
					variables: {
						checkoutId,
					},
				}),
			});
			
			const result = await response.json() as CheckoutQueryResponse;
			if (result.data?.checkout) {
				// Update both local state and cache
				setCheckout(result.data.checkout);
				cachedCheckout = result.data.checkout;
				lastFetchTime = Date.now();
			} else {
				// Clear cache if checkout not found or invalid
				cachedCheckout = null;
				setCheckout(null);
				
				// Clear the invalid cookie and create a new checkout on next operation
				Cookies.remove(`checkoutId-${channel}`);
			}
		} catch (error) {
			console.error("Failed to fetch checkout:", error);
			cachedCheckout = null;
			setCheckout(null);
		} finally {
			setLoading(false);
		}
	}, [channel]);
	
	// Listen for cart update events
	useEffect(() => {
		const handleCartUpdate = (event: Event) => {
			// Use proper type casting for CustomEvent
			const customEvent = event as CustomEvent<{
				productId?: string;
				productName?: string;
			}>;
			
			console.log("Cart updated event received", customEvent?.detail);
			
			// Get the name of the added product for animation
			const productName = customEvent?.detail?.productName || "";
			if (productName) {
				setAddedItemName(productName);
			}
			
			// Play animation when products are added
			setCartAnimation(true);
			setTimeout(() => setCartAnimation(false), 1200);
			
			// Force refresh checkout data
			const checkoutId = Checkout.getIdFromCookies(channel);
			if (checkoutId) {
				// Use closure to capture the current fetchCheckout without dependency
				(async () => {
					try {
						setLoading(true);
						// Fetch checkout data directly instead of calling fetchCheckout
						const response = await fetch(`${process.env.NEXT_PUBLIC_SALEOR_API_URL || 'http://localhost:8000/graphql/'}`, {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
							},
							body: JSON.stringify({
								query: `
									query GetCheckout($checkoutId: ID!) {
										checkout(id: $checkoutId) {
											id
											lines {
												id
												quantity
												variant {
													id
													name
													product {
														id
														name
														thumbnail {
															url
															alt
														}
													}
												}
											}
											totalPrice {
												gross {
													amount
													currency
												}
											}
										}
									}
								`,
								variables: {
									checkoutId,
								},
							}),
						});
						
						const result = await response.json() as CheckoutQueryResponse;
						if (result.data?.checkout) {
							setCheckout(result.data.checkout);
							cachedCheckout = result.data.checkout;
							lastFetchTime = Date.now();
						}
					} catch (error) {
						console.error("Error refreshing checkout:", error);
					} finally {
						setLoading(false);
					}
				})();
			}
		};
		
		window.addEventListener('cart:updated', handleCartUpdate);
		
		// Initial fetch
		fetchCheckout();
		
		return () => {
			window.removeEventListener('cart:updated', handleCartUpdate);
		};
	}, [channel]); // Only depend on channel
	
	const toggleDropdown = async () => {
		if (!isDropdownOpen) {
			// When opening, use cached data immediately if available, then refresh
			if (cachedCheckout) {
				setCheckout(cachedCheckout);
			}
			
			// Fetch fresh data in the background
			fetchCheckout();
		}
		setIsDropdownOpen(!isDropdownOpen);
	};
	
	const lineCount = checkout?.lines?.reduce((result, line) => result + line.quantity, 0) || 0;
	
	const handleQuantityChange = async (lineId: string, quantity: number) => {
		const checkoutId = Checkout.getIdFromCookies(channel);
		if (!checkoutId) return;
		
		try {
			// Use the checkout client API
			await Checkout.updateLine(checkoutId, lineId, quantity);
			
			// Fetch updated checkout data
			fetchCheckout(true);
		} catch (error) {
			console.error("Error updating line quantity:", error);
		}
	};
	
	const handleRemoveLine = async (lineId: string) => {
		const checkoutId = Checkout.getIdFromCookies(channel);
		if (!checkoutId) return;
		
		try {
			// Use the checkout client API
			await Checkout.removeLine(checkoutId, lineId);
			
			// Fetch updated checkout data
			fetchCheckout(true);
		} catch (error) {
			console.error("Error removing line:", error);
		}
	};

	return (
		<div className="relative">
			<button
				ref={buttonRef}
				onClick={toggleDropdown}
				className={clsx("flex items-center gap-1 px-2 py-1 rounded-md transition-colors", {
					"text-white hover:text-amber-300": !cartAnimation,
					"text-green-400": cartAnimation,
				})}
				aria-expanded={isDropdownOpen}
				aria-label={`Shopping cart with ${lineCount} ${lineCount === 1 ? 'item' : 'items'}`}
			>
				<div className="relative">
					<svg 
						xmlns="http://www.w3.org/2000/svg" 
						className={clsx("h-6 w-6 transition-transform", { 
							"animate-bounce": cartAnimation 
						})} 
						fill="none" 
						viewBox="0 0 24 24" 
						stroke="currentColor"
					>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
					</svg>
					
					{lineCount > 0 && (
						<span 
							className={clsx(
								"absolute -top-1 -right-1 flex items-center justify-center w-4 h-4 text-xs text-white bg-amber-700 rounded-full", 
								{ "animate-scale bg-green-600": cartAnimation }
							)}
						>
							{lineCount}
						</span>
					)}
				</div>
				<span className="hidden lg:inline text-sm">Cart</span>
			</button>

			{/* Cart dropdown */}
			{isDropdownOpen && (
				<div 
					ref={dropdownRef}
					className="absolute right-0 mt-2 w-80 md:w-96 bg-white border border-gray-200 rounded-md shadow-lg p-4 z-50 animate-fadeIn"
				>
					<div className="flex justify-between items-center mb-3 border-b pb-2">
						<h3 className="font-bold text-gray-800">Your Cart</h3>
						<span className="text-sm text-gray-500">
							{lineCount} {lineCount === 1 ? 'item' : 'items'}
						</span>
					</div>
					
					{loading ? (
						<div className="flex justify-center py-4">
							<div className="animate-spin h-6 w-6 border-2 border-amber-600 border-t-transparent rounded-full" />
						</div>
					) : checkout?.lines && checkout.lines.length > 0 ? (
						<>
							<div className="max-h-64 overflow-y-auto custom-scrollbar space-y-4">
								{checkout.lines.map((line) => (
									<div key={line.id} className="flex py-2 border-b">
										<div className="w-16 h-16 flex-shrink-0 bg-gray-100 rounded overflow-hidden">
											{line.variant.product.thumbnail?.url ? (
												<img 
													src={line.variant.product.thumbnail.url} 
													alt={line.variant.product.thumbnail.alt || line.variant.product.name} 
													className="w-full h-full object-contain"
												/>
											) : (
												<div className="w-full h-full flex items-center justify-center bg-gray-200">
													<svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
													</svg>
												</div>
											)}
										</div>
										
										<div className="ml-3 flex-grow">
											<div className="flex justify-between">
												<div>
													<h4 className="text-sm font-medium text-gray-800">{line.variant.product.name}</h4>
													<p className="text-xs text-gray-500">{line.variant.name}</p>
												</div>
												
												<button 
													onClick={() => handleRemoveLine(line.id)}
													className="text-gray-400 hover:text-red-500"
													aria-label="Remove item"
												>
													<svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
														<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
													</svg>
												</button>
											</div>
											
											<div className="flex justify-between items-center mt-2">
												<div className="flex items-center border rounded">
													<button 
														onClick={() => handleQuantityChange(line.id, Math.max(1, line.quantity - 1))}
														className="px-2 py-1 text-gray-600 hover:bg-gray-100"
														disabled={line.quantity <= 1}
														aria-label="Decrease quantity"
													>
														-
													</button>
													<span className="px-2 py-1 text-sm">{line.quantity}</span>
													<button 
														onClick={() => handleQuantityChange(line.id, line.quantity + 1)}
														className="px-2 py-1 text-gray-600 hover:bg-gray-100"
														aria-label="Increase quantity"
													>
														+
													</button>
												</div>
												
												<span className="font-medium text-amber-700">
													${((checkout.totalPrice.gross.amount / checkout.lines.reduce((t, l) => t + l.quantity, 0)) * line.quantity).toFixed(2)} {checkout.totalPrice.gross.currency}
												</span>
											</div>
										</div>
									</div>
								))}
							</div>
							
							<div className="mt-4 pt-2 border-t">
								<div className="flex justify-between mb-4">
									<span className="font-medium">Total:</span>
									<span className="font-bold text-amber-700">${checkout.totalPrice.gross.amount} {checkout.totalPrice.gross.currency}</span>
								</div>
								
								<div className="grid grid-cols-2 gap-3">
									<LinkWithChannel
										href={"/cart"}
										className="px-4 py-2 text-center bg-gray-200 hover:bg-gray-300 text-gray-800 rounded transition-colors"
									>
										View Cart
									</LinkWithChannel>
									
									<LinkWithChannel
										href={"/checkout"}
										className="px-4 py-2 text-center bg-amber-700 hover:bg-amber-600 text-white rounded transition-colors"
									>
										Checkout
									</LinkWithChannel>
								</div>
							</div>
						</>
					) : (
						<div className="py-6 text-center">
							<svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
							</svg>
							<p className="text-gray-500 mb-3">Your cart is empty</p>
							<LinkWithChannel
								href={"/categories/featured-products"}
								className="text-amber-700 hover:text-amber-800 font-medium"
							>
								Continue Shopping
							</LinkWithChannel>
						</div>
					)}
					
					{/* Recently added notification */}
					{cartAnimation && addedItemName && (
						<div className="mt-3 p-2 bg-green-100 text-green-800 rounded text-sm animate-fade-in-out">
							✓ {addedItemName} added to cart
						</div>
					)}
				</div>
			)}
		</div>
	);
};
