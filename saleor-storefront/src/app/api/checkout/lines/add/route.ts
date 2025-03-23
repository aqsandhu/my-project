import { NextResponse } from 'next/server';
import { executeGraphQL } from "@/lib/graphql";
import { CheckoutAddLineDocument } from "@/gql/graphql";
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  try {
    // Fix the type issues by properly typing the request body
    const body = await request.json();
    const { checkoutId, productId, variantId, quantity = 1, channel = "default-channel" } = body as {
      checkoutId?: string;
      productId?: string;
      variantId?: string;
      quantity?: number;
      channel?: string;
    };
    
    if (!checkoutId) {
      return NextResponse.json(
        { error: 'Checkout ID is required' },
        { status: 400 }
      );
    }

    // If a specific variantId is provided, use it
    // Otherwise, we need to fetch the first variant of the product
    let finalVariantId = variantId;
    
    if (!finalVariantId && productId) {
      // For simplicity, let's use a direct GraphQL query to get the first variant
      const response = await fetch(`${process.env.NEXT_PUBLIC_SALEOR_API_URL || 'http://localhost:8000/graphql/'}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: `
            query GetProductVariants($productId: ID!, $channel: String!) {
              product(id: $productId, channel: $channel) {
                variants {
                  id
                  name
                }
              }
            }
          `,
          variables: {
            productId,
            channel,
          },
        }),
      });

      // Fix the type for the response result
      interface ProductQueryResult {
        data?: {
          product?: {
            variants?: Array<{ id: string; name: string }>;
          };
        };
      }
      
      const result = await response.json() as ProductQueryResult;
      const variants = result.data?.product?.variants;
      
      if (variants && variants.length > 0) {
        finalVariantId = variants[0].id;
      } else {
        return NextResponse.json(
          { error: 'No variants found for this product' },
          { status: 400 }
        );
      }
    }
    
    if (!finalVariantId) {
      return NextResponse.json(
        { error: 'Variant ID is required' },
        { status: 400 }
      );
    }

    console.log("Adding to cart:", {
      checkoutId,
      productVariantId: finalVariantId,
      quantity
    });

    // Add the item to the checkout
    const checkoutResult = await executeGraphQL(CheckoutAddLineDocument, {
      variables: {
        id: checkoutId,
        productVariantId: finalVariantId,
        quantity: quantity || 1,
      },
      revalidate: 0,
    });

    // Check for GraphQL errors (from the client)
    if (checkoutResult.checkoutLinesAdd?.errors && checkoutResult.checkoutLinesAdd.errors.length > 0) {
      console.error("GraphQL error adding to cart:", checkoutResult.checkoutLinesAdd.errors);
      return NextResponse.json(
        { error: checkoutResult.checkoutLinesAdd.errors[0].message },
        { status: 400 }
      );
    }

    // Revalidate the cart page path to ensure updated data
    revalidatePath("/cart");
    if (channel) {
      revalidatePath(`/${channel}/cart`);
    }

    // Return success response
    return NextResponse.json({
      success: true,
      checkout: checkoutResult.checkoutLinesAdd?.checkout,
    });
  } catch (error) {
    console.error('Error adding product to cart:', error);
    return NextResponse.json(
      { error: 'Failed to add product to cart' },
      { status: 500 }
    );
  }
} 