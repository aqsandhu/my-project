"use client";

import { usePathname } from "next/navigation";
import { LinkWithChannel } from "../atoms/LinkWithChannel";
import Image from "next/image";

export const Logo = () => {
	const pathname = usePathname();

	if (pathname === "/") {
		return (
			<h1 className="flex items-center" aria-label="homepage">
				<div className="flex items-center">
					<Image src="/media/logo.png" alt="Logo" width={70} height={70} className="object-contain" />
				</div>
			</h1>
		);
	}
	return (
		<div className="flex items-center">
			<LinkWithChannel aria-label="homepage" href="/">
				<div className="flex items-center">
					<Image src="/media/logo.png" alt="Logo" width={70} height={70} className="object-contain" />
				</div>
			</LinkWithChannel>
		</div>
	);
};
