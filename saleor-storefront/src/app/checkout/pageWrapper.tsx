"use client";

import dynamic from "next/dynamic";

const Root = dynamic(() => import("@/checkout/Root").then((m) => m.Root), { ssr: false });

export const RootWrapper = ({ saleorApiUrl: baxoqApiUrl }: { saleorApiUrl: string }) => {
	if (!baxoqApiUrl) {
		return null;
	}
	return <Root saleorApiUrl={baxoqApiUrl} />;
};
