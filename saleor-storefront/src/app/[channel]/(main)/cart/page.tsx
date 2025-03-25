"use client";

import { useState, useEffect } from "react";
import { LinkWithChannel } from "@/ui/atoms/LinkWithChannel";
import * as Checkout from "@/lib/checkoutClient";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

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
				slug: string;
				thumbnail?: {
					url: string;
					alt?: string;
				};
			};
		};
		totalPrice: {
			gross: {
				amount: number;
				currency: string;
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

interface CheckoutUpdateResponse {
	data?: {
		checkoutLinesUpdate?: {
			checkout: CheckoutData;
			errors?: Array<{ field: string; message: string }>;
		};
	};
	errors?: Array<{ message: string }>;
}

interface CheckoutDeleteResponse {
	data?: {
		checkoutLineDelete?: {
			checkout: CheckoutData;
			errors?: Array<{ field: string; message: string }>;
		};
	};
	errors?: Array<{ message: string }>;
}

export default function CartPage({ params }: { params: { channel: string } }) {
	const [checkout, setCheckout] = useState<CheckoutData | null>(null);
	const [loading, setLoading] = useState(true);
	const [loadingItemId, setLoadingItemId] = useState<string | null>(null);
	const [isCheckingOut, setIsCheckingOut] = useState(false);
	const [updateFeedback, setUpdateFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
	const router = useRouter();
	
	const fetchCheckout = async () => {
		const checkoutId = Checkout.getIdFromCookies(params.channel);
		if (!checkoutId) {
			setLoading(false);
			return;
		}
		
		setLoading(true);
		
		try {
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
											slug
											thumbnail {
												url
												alt
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
			}
		} catch (error) {
			console.error("Failed to fetch checkout:", error);
		} finally {
			setLoading(false);
		}
	};
	
	const handleQuantityChange = async (lineId: string, quantity: number) => {
		const checkoutId = Checkout.getIdFromCookies(params.channel);
		if (!checkoutId) return;
		
		setLoadingItemId(lineId);
		setUpdateFeedback(null);
		
		try {
			const response = await fetch(`${process.env.NEXT_PUBLIC_SALEOR_API_URL || 'http://localhost:8000/graphql/'}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					query: `
						mutation UpdateCheckoutLine($checkoutId: ID!, $lineId: ID!, $quantity: Int!) {
							checkoutLinesUpdate(
								checkoutId: $checkoutId,
								lines: [{ lineId: $lineId, quantity: $quantity }]
							) {
								checkout {
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
												slug
												thumbnail {
													url
													alt
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
									totalPrice {
										gross {
											amount
											currency
										}
									}
								}
								errors {
									field
									message
								}
							}
						}
					`,
					variables: {
						checkoutId,
						lineId,
						quantity,
					},
				}),
			});
			
			const result = await response.json() as CheckoutUpdateResponse;
			if (result.data?.checkoutLinesUpdate?.checkout) {
				setCheckout(result.data.checkoutLinesUpdate.checkout);
				setUpdateFeedback({ type: 'success', message: 'Cart updated successfully' });
				
				// Trigger cart update event
				const cartUpdateEvent = new CustomEvent('cart:updated');
				window.dispatchEvent(cartUpdateEvent);
			} else if (result.data?.checkoutLinesUpdate?.errors?.length) {
				setUpdateFeedback({ 
					type: 'error', 
					message: result.data.checkoutLinesUpdate.errors[0].message || 'Failed to update cart' 
				});
			}
		} catch (error) {
			console.error("Failed to update quantity:", error);
			setUpdateFeedback({ type: 'error', message: 'Failed to update cart' });
		} finally {
			setLoadingItemId(null);
		}
	};
	
	const handleRemoveLine = async (lineId: string) => {
		const checkoutId = Checkout.getIdFromCookies(params.channel);
		if (!checkoutId) return;
		
		setLoadingItemId(lineId);
		
		try {
			const response = await fetch(`${process.env.NEXT_PUBLIC_SALEOR_API_URL || 'http://localhost:8000/graphql/'}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					query: `
						mutation RemoveCheckoutLine($checkoutId: ID!, $lineId: ID!) {
							checkoutLineDelete(
								checkoutId: $checkoutId,
								lineId: $lineId
							) {
								checkout {
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
												slug
												thumbnail {
													url
													alt
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
									totalPrice {
										gross {
											amount
											currency
										}
									}
								}
								errors {
									field
									message
								}
							}
						}
					`,
					variables: {
						checkoutId,
						lineId,
					},
				}),
			});
			
			const result = await response.json() as CheckoutDeleteResponse;
			if (result.data?.checkoutLineDelete?.checkout) {
				setCheckout(result.data.checkoutLineDelete.checkout);
				
				// Trigger cart update event
				const cartUpdateEvent = new CustomEvent('cart:updated');
				window.dispatchEvent(cartUpdateEvent);
			}
		} catch (error) {
			console.error("Failed to remove item:", error);
		} finally {
			setLoadingItemId(null);
		}
	};
	
	const handleProceedToCheckout = () => {
		const checkoutId = Checkout.getIdFromCookies(params.channel);
		if (!checkoutId) return;
		
		setIsCheckingOut(true);
		router.push(`/checkout?checkout=${checkoutId}`);
	};
	
	// Fetch checkout data when component mounts
	useEffect(() => {
		fetchCheckout();
	}, []);

	// Clear feedback after 3 seconds
	useEffect(() => {
		if (updateFeedback) {
			const timer = setTimeout(() => setUpdateFeedback(null), 3000);
			return () => clearTimeout(timer);
		}
	}, [updateFeedback]);

	return (
		<div className="mx-auto max-w-7xl p-4 md:p-8">
			<h1 className="text-3xl font-bold mb-8 text-amber-500 border-b border-amber-500/30 pb-2">Your Cart</h1>
			
			{/* Feedback Toast */}
			<AnimatePresence>
				{updateFeedback && (
					<motion.div
						initial={{ opacity: 0, y: -20 }}
						animate={{ opacity: 1, y: 0 }}
						exit={{ opacity: 0, y: -20 }}
						className={`fixed top-4 right-4 p-4 rounded-md shadow-lg z-50 ${
							updateFeedback.type === 'success' ? 'bg-green-600' : 'bg-red-600'
						} text-white`}
					>
						{updateFeedback.message}
					</motion.div>
				)}
			</AnimatePresence>
			
			{loading ? (
				<div className="flex justify-center items-center py-12">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-700" />
				</div>
			) : !checkout || checkout.lines.length === 0 ? (
				<motion.div 
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					className="text-center py-12"
				>
					<div className="mb-6">
						<svg className="mx-auto h-16 w-16 text-amber-500/50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
						</svg>
						<p className="text-gray-400 mt-4">Your cart is empty</p>
					</div>
					<LinkWithChannel 
						href="/" 
						className="bg-amber-700 hover:bg-amber-600 text-white px-6 py-2 rounded transition-colors inline-block"
					>
						Continue Shopping
					</LinkWithChannel>
				</motion.div>
			) : (
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
					<div className="lg:col-span-2">
						<ul className="space-y-6">
							<AnimatePresence>
								{checkout.lines.map((line) => (
									<motion.li
										key={line.id}
										layout
										initial={{ opacity: 0, y: 20 }}
										animate={{ opacity: 1, y: 0 }}
										exit={{ opacity: 0, y: -20 }}
										className="bg-[#241505] border border-amber-900/30 rounded-md overflow-hidden p-4"
									>
										<div className="flex items-start gap-4">
											<div className="w-24 h-24 bg-[#1a1005] rounded-md overflow-hidden flex-shrink-0">
												{line.variant.product.thumbnail && (
													<Image
														src={line.variant.product.thumbnail.url}
														alt={line.variant.product.thumbnail.alt || line.variant.product.name}
														width={96}
														height={96}
														className="w-full h-full object-cover"
													/>
												)}
											</div>
											<div className="flex-grow">
												<LinkWithChannel
													href={`/products/${line.variant.product.slug}`}
													className="text-lg font-medium text-amber-400 hover:text-amber-300 transition-colors"
												>
													{line.variant.product.name}
												</LinkWithChannel>
												<p className="text-sm text-gray-400 mt-1">{line.variant.name}</p>
												<p className="text-amber-300 mt-2">
													{line.totalPrice.gross.amount} {line.totalPrice.gross.currency}
												</p>
											</div>
											
											<div className="flex items-center">
												<div className="flex items-center bg-[#1a1005] rounded-md border border-amber-900/30">
													<button 
														onClick={() => handleQuantityChange(line.id, Math.max(1, line.quantity - 1))}
														disabled={loadingItemId === line.id}
														className="text-gray-400 hover:text-amber-400 w-8 h-8 flex items-center justify-center transition-colors"
													>
														-
													</button>
													<div className="w-12 h-8 flex items-center justify-center border-x border-amber-900/30">
														{loadingItemId === line.id ? (
															<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-400" />
														) : (
															<span className="text-sm text-gray-300">{line.quantity}</span>
														)}
													</div>
													<button 
														onClick={() => handleQuantityChange(line.id, line.quantity + 1)}
														disabled={loadingItemId === line.id}
														className="text-gray-400 hover:text-amber-400 w-8 h-8 flex items-center justify-center transition-colors"
													>
														+
													</button>
												</div>
												
												<button 
													onClick={() => handleRemoveLine(line.id)}
													disabled={loadingItemId === line.id}
													className="ml-4 text-gray-400 hover:text-red-500 p-2 transition-colors"
													aria-label="Remove item"
												>
													<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
														<path d="M18 6L6 18M6 6l12 12" />
													</svg>
												</button>
											</div>
										</div>
									</motion.li>
								))}
							</AnimatePresence>
						</ul>
					</div>
					
					<div className="lg:col-span-1">
						<motion.div
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							className="bg-[#241505] border border-amber-900/30 rounded-md p-6 sticky top-20"
						>
							<h2 className="text-xl font-semibold text-amber-400 mb-4">Order Summary</h2>
							
							<div className="space-y-3 mb-6">
								<div className="flex justify-between text-sm">
									<span className="text-gray-400">Subtotal</span>
									<span className="text-gray-300">
										{checkout.totalPrice.gross.amount} {checkout.totalPrice.gross.currency}
									</span>
								</div>
								<div className="flex justify-between text-sm">
									<span className="text-gray-400">Shipping</span>
									<span className="text-gray-300">Calculated at checkout</span>
								</div>
								<div className="border-t border-amber-900/30 pt-3">
									<div className="flex justify-between items-center">
										<span className="text-lg text-gray-300 font-medium">Total</span>
										<span className="text-xl text-amber-400 font-semibold">
											{checkout.totalPrice.gross.amount} {checkout.totalPrice.gross.currency}
										</span>
									</div>
								</div>
							</div>
							
							<button 
								onClick={handleProceedToCheckout}
								disabled={isCheckingOut}
								className={`w-full ${
									isCheckingOut ? 'bg-gray-600' : 'bg-amber-700 hover:bg-amber-600'
								} text-white text-center py-3 rounded transition-colors font-medium flex justify-center items-center`}
							>
								{isCheckingOut ? (
									<>
										<div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
										Processing...
									</>
								) : (
									'Proceed to Checkout'
								)}
							</button>
							
							<LinkWithChannel 
								href="/" 
								className="w-full block text-center mt-4 text-amber-400 hover:text-amber-300 transition-colors"
							>
								Continue Shopping
							</LinkWithChannel>
						</motion.div>
					</div>
				</div>
			)}
		</div>
	);
}
