import { NextResponse } from 'next/server';
import { executeGraphQL } from "@/lib/graphql";
import { CheckoutCreateDocument } from "@/gql/graphql";

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { channel = "default-channel" } = body as { channel?: string };
    
    // Create a new checkout
    const checkoutResult = await executeGraphQL(CheckoutCreateDocument, {
      variables: { channel },
      revalidate: 0
    });
    
    // Check for GraphQL errors
    if (checkoutResult.checkoutCreate?.errors && checkoutResult.checkoutCreate.errors.length > 0) {
      return NextResponse.json(
        { error: checkoutResult.checkoutCreate.errors[0].code },
        { status: 400 }
      );
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      data: checkoutResult,
    });
  } catch (error) {
    console.error('Error creating checkout:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout' },
      { status: 500 }
    );
  }
} 