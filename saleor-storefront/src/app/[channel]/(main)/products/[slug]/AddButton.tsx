"use client";

import { useFormStatus } from "react-dom";
import { useEffect, useState } from "react";
import { useFormState } from "react-dom";

interface AddItemState {
	success?: boolean;
	error?: string;
}

// Define a type for server actions
type ServerAction = (formData: FormData) => Promise<AddItemState>;

export function AddButton({ 
	disabled, 
	formAction 
}: { 
	disabled?: boolean; 
	formAction: any; // Using any for now to avoid TypeScript issues with server actions
}) {
	// Use type assertion for the server action
	const [state, formAction2] = useFormState<AddItemState, FormData>(formAction, {} as AddItemState);
	const { pending } = useFormStatus();
	const isButtonDisabled = disabled || pending;
	const [wasSubmitted, setWasSubmitted] = useState(false);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	
	// Detect when form submission completes
	useEffect(() => {
		if (wasSubmitted && !pending) {
			if ((state as AddItemState)?.success) {
				// Create and dispatch cart updated event after successful submission
				const cartUpdateEvent = new CustomEvent('cart:updated');
				window.dispatchEvent(cartUpdateEvent);
				console.log('Cart updated event dispatched from product detail page');
				
				// Show success toast
				const successToast = document.createElement('div');
				successToast.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50 animate-fade-in-out';
				successToast.textContent = `Item added to cart successfully!`;
				document.body.appendChild(successToast);
				setTimeout(() => {
					successToast.remove();
				}, 3000);
			} else if ((state as AddItemState)?.error) {
				setErrorMessage((state as AddItemState).error || null);
				
				// Show error toast
				const errorToast = document.createElement('div');
				errorToast.className = 'fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded shadow-lg z-50 animate-fade-in-out';
				errorToast.textContent = (state as AddItemState).error || 'Error adding item to cart';
				document.body.appendChild(errorToast);
				setTimeout(() => {
					errorToast.remove();
				}, 5000);
			}
			
			// Reset for next time
			setWasSubmitted(false);
		} else if (pending) {
			setWasSubmitted(true);
			setErrorMessage(null);
		}
	}, [pending, wasSubmitted, state]);
	
	return (
		<>
			<button
				type="submit"
				aria-disabled={isButtonDisabled}
				aria-busy={pending}
				onClick={(e) => isButtonDisabled && e.preventDefault()}
				className="w-full h-12 items-center rounded-md bg-amber-700 px-6 py-3 text-base font-medium leading-6 text-white shadow hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-70 hover:disabled:bg-amber-700 aria-disabled:cursor-not-allowed aria-disabled:opacity-70 hover:aria-disabled:bg-amber-700"
			>
				{pending ? (
					<div className="inline-flex items-center">
						<svg
							className="-ml-1 mr-3 h-5 w-5 animate-spin text-white"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle
								className="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								strokeWidth="4"
							></circle>
							<path
								className="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
							></path>
						</svg>
						<span>Processing...</span>
					</div>
				) : (
					<span>Add to cart</span>
				)}
			</button>
			
			{errorMessage && (
				<div className="mt-2 text-red-600 text-sm">
					{errorMessage}
				</div>
			)}
		</>
	);
}
