"use client";

import Link from "next/link";
import { useState } from "react";
import { LinkWithChannel } from "@/ui/atoms/LinkWithChannel";

// Define menu structure similar to TrueSwords.com
const menuStructure = {
	main: [
		{
			name: "SWORD STEALS",
			href: "/categories/sword-steals",
			highlight: true
		},
		{
			name: "CLOSEOUTS",
			href: "/categories/closeouts",
			highlight: true
		},
		{
			name: "NEW",
			href: "/categories/new",
			highlight: true
		},
		{
			name: "SWORDS",
			href: "/categories/swords",
			children: [
				{
					name: "BATTLE READY SWORDS",
					href: "/categories/battle-ready-swords"
				},
				{
					name: "FANTASY SWORDS",
					href: "/categories/fantasy-swords",
					children: [
						{ name: "ANIME SWORDS", href: "/categories/anime-swords" },
						{ name: "FILM AND VIDEO GAME SWORDS", href: "/categories/film-video-game-swords" },
						{ name: "LORD OF THE RINGS SWORDS", href: "/categories/lotr-swords" }
					]
				},
				{
					name: "HISTORICAL SWORDS",
					href: "/categories/historical-swords",
					children: [
						{ name: "MEDIEVAL SWORDS", href: "/categories/medieval-swords" },
						{ name: "VIKING SWORDS", href: "/categories/viking-swords" },
						{ name: "SAMURAI SWORDS", href: "/categories/samurai-swords" }
					]
				},
				{
					name: "JAPANESE SWORDS",
					href: "/categories/japanese-swords",
					children: [
						{ name: "JAPANESE KATANA", href: "/categories/japanese-katana" },
						{ name: "HANDMADE SWORDS", href: "/categories/handmade-swords" }
					]
				},
				{
					name: "PRACTICE SWORDS",
					href: "/categories/practice-swords"
				},
				{
					name: "SWORD CANES",
					href: "/categories/sword-canes"
				}
			]
		},
		{
			name: "KNIVES",
			href: "/categories/knives",
			children: [
				{ name: "BUTTERFLY KNIVES", href: "/categories/butterfly-knives" },
				{ name: "FIXED BLADE KNIVES", href: "/categories/fixed-blade-knives" },
				{ name: "POCKET KNIVES", href: "/categories/pocket-knives" }
			]
		},
		{
			name: "BRANDS",
			href: "/brands",
			children: [
				{ name: "HONSHU", href: "/brands/honshu" },
				{ name: "SHINWA", href: "/brands/shinwa" },
				{ name: "SHIKOTO", href: "/brands/shikoto" }
			]
		}
	]
};

export const NavLinks = ({ channel }: { channel: string }) => {
	const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

	const handleMouseEnter = (name: string) => {
		setActiveDropdown(name);
	};

	const handleMouseLeave = () => {
		setActiveDropdown(null);
	};

	return (
		<>
			{menuStructure.main.map((item) => (
				<li 
					key={item.name} 
					className="relative group"
					onMouseEnter={() => handleMouseEnter(item.name)}
					onMouseLeave={handleMouseLeave}
				>
					<LinkWithChannel
						href={item.href}
						className={`block px-2 py-2 font-medium transition-colors ${
							item.highlight ? 'text-amber-400 hover:text-amber-300' : 'text-white hover:text-amber-300'
						}`}
					>
						{item.name}
					</LinkWithChannel>
					
					{item.children && activeDropdown === item.name && (
						<div className="absolute left-0 z-10 w-56 mt-1 animate-fadeIn">
							<div className="py-2 bg-gray-800 rounded-md shadow-xl">
								{item.children.map((child) => (
									<div key={child.name} className="relative group/submenu">
										<LinkWithChannel
											href={child.href}
											className="block px-4 py-2 text-sm text-white hover:bg-amber-700"
										>
											{child.name}
											{child.children && (
												<span className="absolute right-4 top-1/2 transform -translate-y-1/2">›</span>
											)}
										</LinkWithChannel>
										
										{child.children && (
											<div className="absolute left-full top-0 w-56 ml-0.5 hidden group-hover/submenu:block">
												<div className="py-2 bg-gray-800 rounded-md shadow-xl">
													{child.children.map((subChild) => (
														<LinkWithChannel
															key={subChild.name}
															href={subChild.href}
															className="block px-4 py-2 text-sm text-white hover:bg-amber-700"
														>
															{subChild.name}
														</LinkWithChannel>
													))}
												</div>
											</div>
										)}
									</div>
								))}
							</div>
						</div>
					)}
				</li>
			))}
		</>
	);
};
