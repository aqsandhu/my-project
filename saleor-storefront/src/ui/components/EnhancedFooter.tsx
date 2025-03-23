import { LinkWithChannel } from "../atoms/LinkWithChannel";
import { BladeIcon } from "../atoms/BladeIcon";

export const EnhancedFooter = ({ channel }: { channel: string }) => {
	return (
		<footer className="border-t bg-neutral-50">
			<div className="mx-auto max-w-7xl px-4 py-10 md:px-8">
				<div className="flex flex-col items-center md:flex-row md:justify-between">
					<div className="mb-6 flex flex-col items-center text-center md:mb-0 md:items-start md:text-left">
						<LinkWithChannel
							href="/"
							className="flex items-center space-x-2 text-neutral-900"
						>
							<BladeIcon />
							<span className="font-bold">Blade Shop</span>
						</LinkWithChannel>
						<p className="mt-2 text-sm text-neutral-500">
							Premium swords and knives - Craftsmanship at its finest
						</p>
					</div>

					<div className="flex flex-col space-y-4 text-center md:flex-row md:items-center md:space-x-6 md:space-y-0 md:text-left">
						<LinkWithChannel
							href="/about"
							className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
						>
							About Us
						</LinkWithChannel>
						<LinkWithChannel
							href="/shipping"
							className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
						>
							Shipping Policy
						</LinkWithChannel>
						<LinkWithChannel
							href="/contact"
							className="text-sm font-medium text-neutral-600 hover:text-neutral-900"
						>
							Contact
						</LinkWithChannel>
					</div>
				</div>
				<div className="mt-10 border-t border-neutral-200 pt-6">
					<p className="text-center text-sm text-neutral-500">
						&copy; {new Date().getFullYear()} Blade Shop. All rights reserved.
					</p>
				</div>
			</div>
		</footer>
	);
}; 