"use client";

// Updated to use our custom auth module instead of @baxoq/auth-sdk
import { AuthProvider as CustomAuthProvider, useAuthChange, createAuthClient } from "@/lib/auth";
import { invariant } from "ts-invariant";
import { useState, type ReactNode } from "react";
import {
	type Client,
	Provider as UrqlProvider,
	cacheExchange,
	createClient,
	dedupExchange,
	fetchExchange,
} from "urql";
import { getClientAuthClient } from '@/lib/auth/client';

// Baxoq API URL
const baxoqApiUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL;
invariant(baxoqApiUrl, "Missing NEXT_PUBLIC_SALEOR_API_URL env variable");

// Create Baxoq auth client using our custom module
export const baxoqAuthClient = createAuthClient({
	apiUrl: baxoqApiUrl,
});

const saleorApiUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL;
invariant(saleorApiUrl, "Missing NEXT_PUBLIC_SALEOR_API_URL env variable");

const saleorAuthClient = getClientAuthClient();

const makeUrqlClient = () => {
	return createClient({
		url: saleorApiUrl as string,
		fetch: saleorAuthClient.fetchWithAuth as typeof fetch,
		exchanges: [dedupExchange, cacheExchange, fetchExchange],
	});
};

export function AuthProvider({ children }: { children: ReactNode }) {
	invariant(baxoqApiUrl, "Missing NEXT_PUBLIC_SALEOR_API_URL env variable");

	const [urqlClient, setUrqlClient] = useState<Client>(() => makeUrqlClient());
	useAuthChange({
		apiUrl: baxoqApiUrl,
		onSignedOut: () => {
			setUrqlClient(makeUrqlClient());
		},
		onSignedIn: () => {
			setUrqlClient(makeUrqlClient());
		},
	});

	return (
		<CustomAuthProvider client={baxoqAuthClient}>
			<UrqlProvider value={urqlClient}>{children}</UrqlProvider>
		</CustomAuthProvider>
	);
}
