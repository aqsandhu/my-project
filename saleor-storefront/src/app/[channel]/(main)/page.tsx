import { ProductListByCollectionDocument } from "@/gql/graphql";
import { executeGraphQL } from "@/lib/graphql";
import { ProductList } from "@/ui/components/ProductList";
import Link from "next/link";
import Image from "next/image";

export const metadata = {
	title: "Blade Shop - Premium Swords & Knives",
	description:
		"Discover our exclusive collection of high-quality swords and knives. Craftsmanship that stands the test of time.",
};

export default async function Page({ params }: { params: { channel: string } }) {
	// Add debugging
	console.log("Channel param:", params.channel);
	console.log("API URL:", process.env.NEXT_PUBLIC_SALEOR_API_URL);
	
	try {
		// Fetch featured products
		const featuredData = await executeGraphQL(ProductListByCollectionDocument, {
			variables: {
				slug: "featured-products",
				channel: params.channel,
			},
			revalidate: 60,
		});
		
		// Fetch new arrivals (in a real app, this would be a separate collection)
		const newArrivalsData = await executeGraphQL(ProductListByCollectionDocument, {
			variables: {
				slug: "featured-products", // Using the same collection for demo purposes
				channel: params.channel,
			},
			revalidate: 60,
		});
		
		// Fetch best sellers (in a real app, this would be a separate collection)
		const bestSellersData = await executeGraphQL(ProductListByCollectionDocument, {
			variables: {
				slug: "featured-products", // Using the same collection for demo purposes
				channel: params.channel,
			},
			revalidate: 60,
		});

		console.log("GraphQL data received:", JSON.stringify(featuredData, null, 2));
		
		if (!featuredData.collection?.products) {
			console.log("No collection or products found");
			return (
				<section className="mx-auto max-w-7xl p-8 pb-16 bg-[#2e1a05] text-gray-200">
					<h2 className="text-2xl font-bold mb-4 text-amber-500 border-b border-amber-500/30 pb-2">Featured Blades</h2>
					<p className="mb-2"><strong>No products found.</strong> Please check back later for our collection of premium swords and knives.</p>
					<div className="p-4 bg-amber-900/20 border border-amber-800/50 rounded-md mt-4">
						<p className="font-semibold text-amber-400">Looking for exceptional craftsmanship?</p>
						<p>Our master blacksmiths are crafting new products. Check back soon.</p>
					</div>
				</section>
			);
		}

		const featuredProducts = featuredData.collection?.products.edges.map(({ node: product }) => product);
		const newArrivals = newArrivalsData.collection?.products?.edges.map(({ node: product }) => product)?.slice(0, 4) || [];
		const bestSellers = bestSellersData.collection?.products?.edges.map(({ node: product }) => product)?.slice(0, 8) || [];
		
		console.log("Products count:", featuredProducts.length);

		return (
			<>
				{/* Hero Banner */}
				<section className="bg-amber-900 py-6 text-white">
					<div className="mx-auto max-w-7xl px-4 flex flex-col md:flex-row items-center justify-between gap-6">
						<div className="max-w-2xl">
							<h1 className="text-4xl font-bold mb-4 text-amber-300">Exceptional Blades, Unparalleled Craftsmanship</h1>
							<p className="mb-6 text-gray-100">Discover our collection of meticulously crafted swords and knives. Each piece is a testament to traditional craftsmanship and modern precision.</p>
							<div className="flex gap-4">
								<Link href={`/${params.channel}/categories/swords`} className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-md font-medium transition-colors">
									Shop Swords
								</Link>
								<Link href={`/${params.channel}/categories/knives`} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md font-medium transition-colors">
									Shop Knives
								</Link>
							</div>
						</div>
						<div className="w-full md:w-1/3 relative">
							{/* This would be a rotating banner in a real implementation */}
							<div className="bg-amber-800 p-6 rounded-lg shadow-lg">
								<div className="text-lg font-bold text-white mb-2">SWORD STEALS</div>
								<p className="text-amber-200 mb-4">Limited time offers on our premium collection</p>
								<Link href={`/${params.channel}/categories/sword-steals`} className="text-amber-300 hover:text-amber-200 font-medium">
									Shop Now →
								</Link>
							</div>
						</div>
					</div>
				</section>
				
				{/* Shop By Category */}
				<section className="bg-gray-100 py-8">
					<div className="mx-auto max-w-7xl px-4">
						<h2 className="text-2xl font-bold mb-6 text-amber-800">Shop By Category</h2>
						<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
							<Link href={`/${params.channel}/categories/japanese-swords`} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
								<div className="h-40 bg-amber-100 flex items-center justify-center">
									<span className="text-lg font-medium text-amber-800">Japanese Swords</span>
								</div>
							</Link>
							<Link href={`/${params.channel}/categories/historical-swords`} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
								<div className="h-40 bg-amber-100 flex items-center justify-center">
									<span className="text-lg font-medium text-amber-800">Historical Swords</span>
								</div>
							</Link>
							<Link href={`/${params.channel}/categories/sword-canes`} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
								<div className="h-40 bg-amber-100 flex items-center justify-center">
									<span className="text-lg font-medium text-amber-800">Sword Canes</span>
								</div>
							</Link>
							<Link href={`/${params.channel}/categories/fantasy-swords`} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
								<div className="h-40 bg-amber-100 flex items-center justify-center">
									<span className="text-lg font-medium text-amber-800">Fantasy Swords</span>
								</div>
							</Link>
						</div>
					</div>
				</section>
				
				{/* Featured Products Section */}
				<section className="bg-white py-12">
					<div className="mx-auto max-w-7xl px-4">
						<ProductList 
							products={featuredProducts} 
							channel={params.channel} 
							title="Best Selling Swords & Accessories" 
							showFeatured={true} 
						/>
					</div>
				</section>
				
				{/* New Arrivals */}
				<section className="bg-gray-50 py-12">
					<div className="mx-auto max-w-7xl px-4">
						<ProductList 
							products={newArrivals.length > 0 ? newArrivals : []} 
							channel={params.channel} 
							title="New Arrivals" 
							showFeatured={false} 
						/>
					</div>
				</section>
				
				{/* Testimonial/Feature Section */}
				<section className="bg-amber-900 text-white py-12">
					<div className="mx-auto max-w-7xl px-4 text-center">
						<h2 className="text-2xl font-bold mb-6 text-amber-300">Master Craftsmanship</h2>
						<div className="grid md:grid-cols-3 gap-8">
							<div className="bg-amber-800/50 p-6 rounded-lg">
								<h3 className="text-xl font-bold mb-3 text-amber-200">Premium Materials</h3>
								<p>Our blades are forged using only the finest high-carbon steel, ensuring durability and exceptional edge retention.</p>
							</div>
							<div className="bg-amber-800/50 p-6 rounded-lg">
								<h3 className="text-xl font-bold mb-3 text-amber-200">Traditional Techniques</h3>
								<p>Each blade is meticulously crafted using techniques passed down through generations of master bladesmiths.</p>
							</div>
							<div className="bg-amber-800/50 p-6 rounded-lg">
								<h3 className="text-xl font-bold mb-3 text-amber-200">Quality Guaranteed</h3>
								<p>Every product undergoes rigorous quality control to ensure you receive a blade worthy of your collection.</p>
							</div>
						</div>
					</div>
				</section>
				
				{/* Newsletter */}
				<section className="bg-gray-100 py-10">
					<div className="mx-auto max-w-7xl px-4 flex flex-col md:flex-row items-center justify-between">
						<div>
							<h2 className="text-xl font-bold text-amber-800 mb-1">STAY UP TO DATE</h2>
							<p className="text-gray-600">Get the latest releases, sales and promotions!</p>
						</div>
						<div className="mt-4 md:mt-0 flex">
							<input 
								type="email" 
								placeholder="Your Email" 
								className="px-4 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-amber-500"
							/>
							<button className="bg-amber-700 hover:bg-amber-600 text-white px-4 py-2 rounded-r-md">
								Subscribe
							</button>
						</div>
					</div>
				</section>
			</>
		);
	} catch (error) {
		console.error("Error fetching products:", error);
		return (
			<section className="mx-auto max-w-7xl p-8 pb-16 bg-[#2e1a05] text-gray-200">
				<h2 className="text-2xl font-bold mb-4 text-amber-500 border-b border-amber-500/30 pb-2">Error Loading Products</h2>
				<p className="mb-2">There was an error connecting to our inventory system.</p>
				<div className="p-4 bg-red-900/20 border border-red-800/30 rounded-md mb-4">
					<p className="font-semibold text-amber-400">Error details:</p>
					<pre className="whitespace-pre-wrap mt-2 text-sm text-gray-300">
						{error instanceof Error ? error.message : String(error)}
					</pre>
				</div>
			</section>
		);
	}
}
