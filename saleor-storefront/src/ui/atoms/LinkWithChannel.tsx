"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { type ComponentProps } from "react";

export const LinkWithChannel = ({
	href,
	...props
}: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) => {
	const params = useParams<{ channel?: string }>();
	const channel = params?.channel || "default-channel";

	// External links should pass through unchanged
	if (!href.startsWith("/")) {
		return <Link {...props} href={href} />;
	}

	// If href already includes the channel, don't add it again
	if (href.startsWith(`/${channel}/`)) {
		return <Link {...props} href={href} />;
	}
	
	// If href is just "/", avoid double slash
	if (href === "/") {
		return <Link {...props} href={`/${channel}`} />;
	}
	
	// If href starts with "/", remove the leading slash when adding to channel
	const cleanHref = href.startsWith('/') ? href.substring(1) : href;
	
	// Add channel to path, ensuring no double slashes
	const hrefWithChannel = `/${channel}/${cleanHref}`;
	
	// Log for debugging
	if (typeof process !== 'undefined' && 
	    process.env && 
	    process.env.NODE_ENV === 'development') {
		console.log(`LinkWithChannel: ${href} → ${hrefWithChannel}`);
	}
	
	return <Link {...props} href={hrefWithChannel} />;
};
