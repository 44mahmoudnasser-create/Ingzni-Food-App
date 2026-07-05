import { NextResponse } from "next/server";
import { calculateOptimizedDeliveryRoute } from "@/lib/googleMaps";

// POST /api/delivery-route
// body: { restaurants: [{lat, lng}, ...], customer: {lat, lng} }
export async function POST(request) {
  try {
    const { restaurants, customer } = await request.json();

    if (!restaurants?.length || !customer?.lat || !customer?.lng) {
      return NextResponse.json(
        { error: "بيانات المطاعم أو العميل ناقصة" },
        { status: 400 }
      );
    }

    const result = await calculateOptimizedDeliveryRoute(restaurants, customer);
    return NextResponse.json(result);
  } catch (error) {
    console.error("delivery-route error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
