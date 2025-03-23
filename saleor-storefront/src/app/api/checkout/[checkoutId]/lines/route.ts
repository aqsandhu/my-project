import { NextRequest, NextResponse } from 'next/server';

// Define types for the API response
interface CheckoutLineAddResponse {
  data?: {
    checkoutLinesAdd?: {
      checkout: any;
      errors?: Array<{ field: string; message: string }>;
    };
  };
  errors?: Array<{ message: string }>;
}

export async function POST(
  request: NextRequest,
  { params }: { params: { checkoutId: string } }
) {
  try {
    const { checkoutId } = params;
    const body = await request.json() as { variantId: string; quantity: number };
    const { variantId, quantity } = body;

    if (!variantId || !quantity) {
      return NextResponse.json(
        { error: 'Missing required fields: variantId, quantity' },
        { status: 400 }
      );
    }

    // For simplicity, we're using a direct fetch to the Saleor API
    // This avoids GraphQL schema issues with the generated types
    const response = await fetch(`${process.env.NEXT_PUBLIC_SALEOR_API_URL || 'http://localhost:8000/graphql/'}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          mutation AddCheckoutLine($checkoutId: ID!, $variantId: ID!, $quantity: Int!) {
            checkoutLinesAdd(
              checkoutId: $checkoutId,
              lines: [{ quantity: $quantity, variantId: $variantId }]
            ) {
              checkout {
                id
                lines {
                  id
                  quantity
                  variant {
                    id
                    name
                    product {
                      id
                      name
                      thumbnail {
                        url
                        alt
                      }
                    }
                  }
                }
                totalPrice {
                  gross {
                    amount
                    currency
                  }
                }
              }
              errors {
                field
                message
              }
            }
          }
        `,
        variables: {
          checkoutId,
          variantId,
          quantity,
        },
      }),
    });

    const result = await response.json() as CheckoutLineAddResponse;

    if (result.errors || result.data?.checkoutLinesAdd?.errors?.length) {
      return NextResponse.json(
        { errors: result.errors || result.data?.checkoutLinesAdd?.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(result.data?.checkoutLinesAdd?.checkout);
  } catch (error) {
    console.error('Error adding line to checkout:', error);
    return NextResponse.json(
      { error: 'Failed to add line to checkout' },
      { status: 500 }
    );
  }
} 