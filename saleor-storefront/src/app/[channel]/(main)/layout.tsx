import { type ReactNode } from "react";
import { EnhancedFooter } from "@/ui/components/EnhancedFooter";
import { Header } from "@/ui/components/Header";
import { BannerCarousel } from "@/ui/components/BannerCarousel";

export const metadata = {
	title: "Blade Shop - Premium Swords & Knives",
	description: "Discover our collection of meticulously crafted swords and knives.",
};

// Banner image filenames from the media folder
const bannerImages = [
	"img1.jpg",
	"img2.jpg",
	"img3.jpg",
	"img4.jpg",
	"img5.jpg",
	"img6.jpg",
	"img7.jpg",
	"img8.jpg",
	"img9.jpg",
	"img10.jpg",
	"img11.jpg",
	"img12.jpg",
	"img13.jpg",
];

export default function RootLayout(props: { children: ReactNode; params: { channel: string } }) {
	return (
		<>
			<Header channel={props.params.channel} />
			<BannerCarousel images={bannerImages} />
			<div className="flex min-h-[calc(100dvh-64px-350px)] flex-col bg-[#2e1a05]">
				<main className="flex-1">{props.children}</main>
				<EnhancedFooter channel={props.params.channel} />
			</div>
		</>
	);
}
