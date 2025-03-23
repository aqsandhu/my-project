import { cookies } from "next/headers";
import { CheckoutCreateDocument, CheckoutFindDocument } from "@/gql/graphql";
import { executeGraphQL } from "@/lib/graphql";

export function getIdFromCookies(channel: string) {
	const cookieName = `checkoutId-${channel}`;
	const checkoutId = cookies().get(cookieName)?.value || "";
	return checkoutId;
}

export function saveIdToCookie(channel: string, checkoutId: string) {
	const shouldUseHttps =
		process.env.NEXT_PUBLIC_STOREFRONT_URL?.startsWith("https") || !!process.env.NEXT_PUBLIC_VERCEL_URL;
	const cookieName = `checkoutId-${channel}`;
	cookies().set(cookieName, checkoutId, {
		sameSite: "lax",
		secure: shouldUseHttps,
	});
}

export async function find(checkoutId: string) {
	try {
		const { checkout } = checkoutId
			? await executeGraphQL(CheckoutFindDocument, {
					variables: {
						id: checkoutId,
					},
					revalidate: 0
			  })
			: { checkout: null };

		return checkout;
	} catch {
		// we ignore invalid ID or checkout not found
		return null;
	}
}

export async function findOrCreate({ channel, checkoutId }: { checkoutId?: string; channel: string }) {
	if (!checkoutId) {
		const result = await createCheckout(channel);
		return result?.checkoutCreate?.checkout;
	}
	const checkout = await find(checkoutId);
	if (checkout) return checkout;
	
	const result = await createCheckout(channel);
	return result?.checkoutCreate?.checkout;
}

export async function findById(id: string) {
	try {
		const { checkout } = await executeGraphQL(CheckoutFindDocument, {
			variables: { id },
			revalidate: 0,
		});
		return checkout;
	} catch (e) {
		return null;
	}
}

// Helper function to create a checkout
async function createCheckout(channel: string) {
	console.log("Creating checkout for channel:", channel);
	
	try {
		const result = await executeGraphQL(CheckoutCreateDocument, { 
			variables: { channel },
			revalidate: 0
		});
		return result;
	} catch (e) {
		console.error("Error creating checkout:", e);
		return null;
	}
}
