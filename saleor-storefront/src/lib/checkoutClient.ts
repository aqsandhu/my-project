import Cookies from 'js-cookie';
import { CheckoutCreateDocument, CheckoutFindDocument } from "@/gql/graphql";
import { executeGraphQL } from "@/lib/graphql";

export function getIdFromCookies(channel: string) {
	// Skip if not in browser environment
	if (typeof window === 'undefined' || typeof document === 'undefined') {
		console.log('getIdFromCookies: Not in browser environment, returning empty string');
		return "";
	}
	
	const cookieName = `checkoutId-${channel}`;
	const checkoutId = Cookies.get(cookieName) || "";
	console.log(`Getting checkout ID from cookie: ${cookieName} = ${checkoutId}`);
	return checkoutId;
}

export function saveIdToCookie(channel: string, checkoutId: string) {
	// Skip if not in browser environment
	if (typeof window === 'undefined' || typeof document === 'undefined') {
		console.log('saveIdToCookie: Not in browser environment, skipping cookie save');
		return;
	}
	
	const shouldUseHttps =
		process.env.NEXT_PUBLIC_STOREFRONT_URL?.startsWith("https") || !!process.env.NEXT_PUBLIC_VERCEL_URL;
	const cookieName = `checkoutId-${channel}`;
	
	// Debug info
	console.log(`Saving checkout ID to cookie: ${cookieName} = ${checkoutId}`);
	
	Cookies.set(cookieName, checkoutId, {
		sameSite: "lax",
		secure: shouldUseHttps,
		expires: 30, // 30 days
		path: '/',
	});
}

export async function find(checkoutId: string) {
	try {
		console.log(`Finding checkout with ID: ${checkoutId}`);
		const { checkout } = checkoutId
			? await executeGraphQL(CheckoutFindDocument, {
					variables: {
						id: checkoutId,
					},
					revalidate: 0
				})
			: { checkout: null };

		if (checkout) {
			console.log("Checkout found:", checkout.id);
		} else {
			console.log("No checkout found with ID:", checkoutId);
		}
		return checkout;
	} catch (error) {
		// we ignore invalid ID or checkout not found
		console.error("Error finding checkout:", error);
		return null;
	}
}

export async function findOrCreate({ channel, checkoutId }: { checkoutId?: string; channel: string }) {
	console.log(`Finding or creating checkout. Channel: ${channel}, Checkout ID: ${checkoutId}`);
	
	if (!checkoutId) {
		console.log("No checkout ID provided, creating new checkout");
		const result = await create({ channel });
		const checkout = result.checkoutCreate?.checkout;
		if (checkout?.id) {
			console.log(`New checkout created with ID: ${checkout.id}`);
			saveIdToCookie(channel, checkout.id);
		} else {
			console.error("Failed to create checkout:", result.checkoutCreate?.errors);
		}
		return checkout;
	}
	
	const checkout = await find(checkoutId);
	if (checkout) {
		console.log(`Existing checkout found with ID: ${checkout.id}`);
		return checkout;
	}
	
	// If checkout not found with existing ID, create a new one
	console.log("Checkout not found with provided ID, creating new one");
	const result = await create({ channel });
	const newCheckout = result.checkoutCreate?.checkout;
	if (newCheckout?.id) {
		console.log(`New replacement checkout created with ID: ${newCheckout.id}`);
		saveIdToCookie(channel, newCheckout.id);
	} else {
		console.error("Failed to create replacement checkout:", result.checkoutCreate?.errors);
	}
	return newCheckout;
}

export const create = async ({ channel }: { channel: string }) => {
	console.log(`Creating new checkout for channel: ${channel}`);
	try {
		const result = await executeGraphQL(CheckoutCreateDocument, { 
			revalidate: 0, 
			variables: { channel } 
		});
		
		if (result.checkoutCreate?.errors && result.checkoutCreate.errors.length > 0) {
			console.error("Errors creating checkout:", result.checkoutCreate.errors);
		} else if (result.checkoutCreate?.checkout) {
			console.log("Checkout created successfully:", result.checkoutCreate.checkout.id);
		}
		
		return result;
	} catch (error) {
		console.error("Exception creating checkout:", error);
		throw error;
	}
};

// Additional functions for cart operations
export async function addLine(checkoutId: string, line: { variantId: string; quantity: number }) {
	try {
		console.log(`Adding line to checkout ${checkoutId}:`, line);
		// Check if we're in a browser environment
		if (typeof window === 'undefined') {
			console.warn('addLine called in a non-browser environment');
			return null;
		}
		
		const response = await fetch("/api/checkout/lines/add", {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				checkoutId,
				variantId: line.variantId,
				quantity: line.quantity,
			}),
		});
		
		if (!response.ok) {
			const errorData = await response.json() as { error?: string };
			const errorMessage = errorData.error || `HTTP error ${response.status}`;
			console.error(`Error adding line to checkout: ${errorMessage}`);
			throw new Error(errorMessage);
		}
		
		const result = await response.json();
		console.log("Line added successfully:", result);
		
		// Trigger cart refresh for other components
		const cartUpdateEvent = new CustomEvent('cart:updated');
		window.dispatchEvent(cartUpdateEvent);
		
		return result;
	} catch (error) {
		console.error('Error adding line to checkout:', error);
		throw error;
	}
}

export async function updateLine(checkoutId: string, lineId: string, quantity: number) {
	try {
		console.log(`Updating line ${lineId} in checkout ${checkoutId} to quantity ${quantity}`);
		// Check if we're in a browser environment
		if (typeof window === 'undefined') {
			console.warn('updateLine called in a non-browser environment');
			return null;
		}
		
		const response = await fetch(`/api/checkout/${checkoutId}/lines/${lineId}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({ quantity }),
		});
		
		if (!response.ok) {
			const errorText = await response.text();
			console.error(`Error response (${response.status}):`, errorText);
			throw new Error(`Failed to update line in checkout: ${response.status} ${errorText}`);
		}
		
		const result = await response.json();
		console.log("Line updated successfully:", result);
		
		// Trigger cart refresh for other components
		const cartUpdateEvent = new CustomEvent('cart:updated');
		window.dispatchEvent(cartUpdateEvent);
		
		return result;
	} catch (error) {
		console.error('Error updating line in checkout:', error);
		throw error;
	}
}

export async function removeLine(checkoutId: string, lineId: string) {
	try {
		console.log(`Removing line ${lineId} from checkout ${checkoutId}`);
		// Check if we're in a browser environment
		if (typeof window === 'undefined') {
			console.warn('removeLine called in a non-browser environment');
			return null;
		}
		
		const response = await fetch(`/api/checkout/${checkoutId}/lines/${lineId}`, {
			method: 'DELETE',
		});
		
		if (!response.ok) {
			const errorText = await response.text();
			console.error(`Error response (${response.status}):`, errorText);
			throw new Error(`Failed to remove line from checkout: ${response.status} ${errorText}`);
		}
		
		const result = await response.json();
		console.log("Line removed successfully:", result);
		
		// Trigger cart refresh for other components
		const cartUpdateEvent = new CustomEvent('cart:updated');
		window.dispatchEvent(cartUpdateEvent);
		
		return result;
	} catch (error) {
		console.error('Error removing line from checkout:', error);
		throw error;
	}
}

export async function getCheckout(checkoutId: string) {
	console.log(`Getting checkout details for ID: ${checkoutId}`);
	try {
		const result = await executeGraphQL(CheckoutFindDocument, {
			variables: { id: checkoutId },
			revalidate: 0
		});
		
		if (result.checkout) {
			console.log("Checkout retrieved successfully:", result.checkout.id);
		} else {
			console.log("No checkout found with ID:", checkoutId);
		}
		
		return result;
	} catch (error) {
		console.error("Error getting checkout details:", error);
		throw error;
	}
} 