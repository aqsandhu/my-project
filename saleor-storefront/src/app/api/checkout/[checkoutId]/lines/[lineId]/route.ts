import { NextRequest, NextResponse } from 'next/server';

// Define types for the API responses
interface CheckoutLineUpdateResponse {
  data?: {
    checkoutLinesUpdate?: {
      checkout: any;
      errors?: Array<{ field: string; message: string }>;
    };
  };
  errors?: Array<{ message: string }>;
}

interface CheckoutLineDeleteResponse {
  data?: {
    checkoutLineDelete?: {
      checkout: any;
      errors?: Array<{ field: string; message: string }>;
    };
  };
  errors?: Array<{ message: string }>;
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { checkoutId: string; lineId: string } }
) {
  try {
    const { checkoutId, lineId } = params;
    const body = await request.json() as { quantity: number };
    const { quantity } = body;

    if (!quantity) {
      return NextResponse.json(
        { error: 'Missing required field: quantity' },
        { status: 400 }
      );
    }

    // For simplicity, we're using a direct fetch to the Saleor API
    const response = await fetch(`${process.env.NEXT_PUBLIC_SALEOR_API_URL || 'http://localhost:8000/graphql/'}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          mutation UpdateCheckoutLine($checkoutId: ID!, $lineId: ID!, $quantity: Int!) {
            checkoutLinesUpdate(
              checkoutId: $checkoutId,
              lines: [{ lineId: $lineId, quantity: $quantity }]
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
          lineId,
          quantity,
        },
      }),
    });

    const result = await response.json() as CheckoutLineUpdateResponse;

    if (result.errors || result.data?.checkoutLinesUpdate?.errors?.length) {
      return NextResponse.json(
        { errors: result.errors || result.data?.checkoutLinesUpdate?.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(result.data?.checkoutLinesUpdate?.checkout);
  } catch (error) {
    console.error('Error updating checkout line:', error);
    return NextResponse.json(
      { error: 'Failed to update checkout line' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { checkoutId: string; lineId: string } }
) {
  try {
    const { checkoutId, lineId } = params;

    // For simplicity, we're using a direct fetch to the Saleor API
    const response = await fetch(`${process.env.NEXT_PUBLIC_SALEOR_API_URL || 'http://localhost:8000/graphql/'}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: `
          mutation DeleteCheckoutLine($checkoutId: ID!, $lineId: ID!) {
            checkoutLineDelete(
              checkoutId: $checkoutId,
              lineId: $lineId
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
          lineId,
        },
      }),
    });

    const result = await response.json() as CheckoutLineDeleteResponse;

    if (result.errors || result.data?.checkoutLineDelete?.errors?.length) {
      return NextResponse.json(
        { errors: result.errors || result.data?.checkoutLineDelete?.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(result.data?.checkoutLineDelete?.checkout);
  } catch (error) {
    console.error('Error removing checkout line:', error);
    return NextResponse.json(
      { error: 'Failed to remove checkout line' },
      { status: 500 }
    );
  }
} 