import { createServerAuthClient } from "@/lib/auth/server";
import { invariant } from "ts-invariant";

export const ProductsPerPage = 12;

// Baxoq API URL
export const baxoqApiUrl = process.env.NEXT_PUBLIC_BAXOQ_API_URL;
invariant(baxoqApiUrl, "Missing NEXT_PUBLIC_BAXOQ_API_URL env variable");

// Saleor API URL
export const saleorApiUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL;
invariant(saleorApiUrl, "Missing NEXT_PUBLIC_SALEOR_API_URL env variable");

// Get server auth client using our custom implementation
export const getServerAuthClient = () => {
	return createServerAuthClient(baxoqApiUrl!);
};
