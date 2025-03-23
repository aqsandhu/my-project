"use client";
import { ErrorBoundary } from "react-error-boundary";
import {
	type Client,
	Provider as UrqlProvider,
	cacheExchange,
	createClient,
	dedupExchange,
	fetchExchange,
} from "urql";

import { ToastContainer } from "react-toastify";
import { useAuthChange, useAuth } from "@/lib/auth";
import { useState } from "react";
import { alertsContainerProps } from "./hooks/useAlerts/consts";
import { RootViews } from "./views/RootViews";
import { PageNotFound } from "@/checkout/views/PageNotFound";
import "./index.css";

export const Root = ({ saleorApiUrl: baxoqApiUrl }: { saleorApiUrl: string }) => {
	// Using our custom auth module
	const baxoqAuthClient = useAuth();

	const makeUrqlClient = () =>
		createClient({
			url: baxoqApiUrl,
			suspense: true,
			requestPolicy: "cache-first",
			fetch: (input, init) => baxoqAuthClient.fetchWithAuth(input as Request, init),
			exchanges: [dedupExchange, cacheExchange, fetchExchange],
		});

	const [urqlClient, setUrqlClient] = useState<Client>(makeUrqlClient());
	useAuthChange({
		apiUrl: baxoqApiUrl,
		onSignedOut: () => setUrqlClient(makeUrqlClient()),
		onSignedIn: () => setUrqlClient(makeUrqlClient()),
	});

	return (
		<UrqlProvider value={urqlClient}>
			<ToastContainer {...alertsContainerProps} />
			<ErrorBoundary FallbackComponent={PageNotFound}>
				<RootViews />
			</ErrorBoundary>
		</UrqlProvider>
	);
};
