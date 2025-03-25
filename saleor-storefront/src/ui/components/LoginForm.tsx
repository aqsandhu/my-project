import { getServerAuthClient } from "@/app/config";
import { executeGraphQL } from "@/lib/graphql";

// Since TokenCreateDocument doesn't exist, implement a direct mutation instead
export async function LoginForm() {
	return (
		<div className="mx-auto mt-16 w-full max-w-lg">
			<form
				className="rounded border p-8 shadow-md"
				action={async (formData) => {
					"use server";

					const email = formData.get("email")?.toString();
					const password = formData.get("password")?.toString();

					if (!email || !password) {
						throw new Error("Email and password are required");
					}

					try {
						// Use the API URL from environment
						const apiUrl = process.env.NEXT_PUBLIC_SALEOR_API_URL;
						if (!apiUrl) {
							console.error("Missing SALEOR_API_URL");
							return;
						}

						// Send direct GraphQL request
						const response = await fetch(apiUrl, {
							method: "POST",
							headers: {
								"Content-Type": "application/json"
							},
							body: JSON.stringify({
								query: `
									mutation TokenCreate($email: String!, $password: String!) {
										tokenCreate(email: $email, password: $password) {
											token
											refreshToken
											csrfToken
											errors {
												field
												message
											}
										}
									}
								`,
								variables: { email, password }
							})
						});

						type TokenCreateResponse = {
							data?: {
								tokenCreate?: {
									token?: string;
									refreshToken?: string;
									csrfToken?: string;
									errors?: Array<{
										field: string;
										message: string;
									}>;
								};
							};
							errors?: Array<{
								message: string;
							}>;
						};

						const data = await response.json() as TokenCreateResponse;
						
						if (data.errors?.length) {
							console.error("Login error:", data.errors);
							return;
						}

						if (data.data?.tokenCreate?.errors?.length) {
							console.error("Login failed:", data.data.tokenCreate.errors);
						} else if (data.data?.tokenCreate?.token) {
							console.log("Login successful");
							// Handle token storage here
						}
					} catch (error) {
						console.error("Authentication error:", error);
					}
				}}
			>
				<div className="mb-2">
					<label className="sr-only" htmlFor="email">
						Email
					</label>
					<input
						type="email"
						name="email"
						placeholder="Email"
						className="w-full rounded border bg-neutral-50 px-4 py-2"
					/>
				</div>
				<div className="mb-4">
					<label className="sr-only" htmlFor="password">
						Password
					</label>
					<input
						type="password"
						name="password"
						placeholder="Password"
						autoCapitalize="off"
						autoComplete="off"
						className="w-full rounded border bg-neutral-50 px-4 py-2"
					/>
				</div>

				<button
					className="rounded bg-neutral-800 px-4 py-2 text-neutral-200 hover:bg-neutral-700"
					type="submit"
				>
					Log In
				</button>
			</form>
			<div />
		</div>
	);
}
