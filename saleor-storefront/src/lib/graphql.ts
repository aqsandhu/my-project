import { Client, cacheExchange, createClient, fetchExchange } from 'urql';
import { getClientAuthClient } from './auth/client';
import { type TypedDocumentString } from '@/gql/graphql';
import { getAuthHeaders } from './auth/client';

const API_URL = process.env.NEXT_PUBLIC_SALEOR_API_URL;

if (!API_URL) {
	throw new Error('Missing NEXT_PUBLIC_SALEOR_API_URL env variable');
}

export function createGraphQLClient(): Client {
	const { fetchWithAuth } = getClientAuthClient();

	return createClient({
		url: API_URL as string,
		exchanges: [cacheExchange, fetchExchange],
		fetch: fetchWithAuth as typeof fetch,
	});
}

export const graphQLClient = createGraphQLClient();

interface GraphQLResponse<T> {
	data?: T;
	errors?: Array<{ message: string }>;
}

export async function executeGraphQL<TResult, TVariables>(
	document: TypedDocumentString<TResult, TVariables>,
	{ variables, revalidate }: { variables: TVariables; revalidate?: number }
): Promise<TResult> {
	const apiUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL;
	if (!apiUrl) {
		throw new Error('Missing NEXT_PUBLIC_SALEOR_API_URL');
	}

	const response = await fetch(apiUrl as RequestInfo, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			...getAuthHeaders(),
		},
		body: JSON.stringify({
			query: document,
			variables
		}),
		next: { revalidate }
	});

	const json = await response.json() as GraphQLResponse<TResult>;

	if (json.errors?.length) {
		throw new Error(JSON.stringify(json.errors));
	}

	if (!json.data) {
		throw new Error('No data returned from GraphQL query');
	}

	return json.data;
}
