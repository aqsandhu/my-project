"use client";

import { Suspense, useState } from "react";
import { UserMenuContainer } from "./components/UserMenu/UserMenuContainer";
import { CartNavItem } from "./components/CartNavItem";
import { NavLinks } from "./components/NavLinks";
import { MobileMenu } from "./components/MobileMenu";
import { EnhancedSearch } from "./components/EnhancedSearch";
import Link from "next/link";

export const Nav = ({ channel }: { channel: string }) => {
	const [searchVisible, setSearchVisible] = useState(false);
	
	return (
		<div className="w-full bg-gray-900">
			{/* Top bar with logo, search and user menu */}
			<div className="mx-auto max-w-7xl px-4 py-3">
				<div className="flex items-center justify-between gap-4">
					{/* Logo */}
					<Link href={`/${channel}`} className="flex items-center">
						<span className="text-2xl font-bold text-amber-500">BladeShop</span>
					</Link>
					
					{/* Search - visible on desktop, toggleable on mobile */}
					<div className={`flex-grow max-w-xl transition-all duration-300 ${searchVisible ? 'block' : 'hidden lg:block'}`}>
						<EnhancedSearch channel={channel} />
					</div>
					
					{/* User actions */}
					<div className="flex items-center gap-3">
						{/* Search toggle for mobile */}
						<button 
							className="lg:hidden text-white p-2"
							onClick={() => setSearchVisible(!searchVisible)}
							aria-label="Toggle search"
						>
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
							</svg>
						</button>
						
						{/* Wishlist */}
						<Link 
							href={`/${channel}/wishlist`} 
							className="hidden sm:flex items-center gap-1 text-white hover:text-amber-300 transition-colors"
						>
							<svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
							</svg>
							<span className="text-sm">Wishlist</span>
						</Link>
						
						{/* Cart */}
						<Suspense fallback={<div className="w-6" />}>
							<CartNavItem channel={channel} />
						</Suspense>
						
						{/* User Account */}
						<Suspense fallback={<div className="w-8" />}>
							<UserMenuContainer />
						</Suspense>
					</div>
				</div>
			</div>
			
			{/* Main navigation */}
			<nav className="bg-gray-800 py-2" aria-label="Main navigation">
				<div className="mx-auto max-w-7xl px-4 flex justify-between">
					<ul className="hidden lg:flex items-center space-x-1">
						<NavLinks channel={channel} />
					</ul>
					
					{/* Mobile menu */}
					<div className="lg:hidden">
						<Suspense>
							<MobileMenu>
								<NavLinks channel={channel} />
							</MobileMenu>
						</Suspense>
					</div>
					
					{/* Customer service link */}
					<div className="hidden lg:block">
						<Link 
							href={`/${channel}/pages/customer-service`} 
							className="text-white hover:text-amber-300 text-sm font-medium"
						>
							Customer Service
						</Link>
					</div>
				</div>
			</nav>
		</div>
	);
};
