/**
 * دالة لحساب أقصر مسار لمجموعة مطاعم وعميل باستخدام Google Directions API.
 * ملاحظة مهمة: الدالة دي لازم تتنادى من السيرفر بس (Route Handler)،
 * مش من المتصفح مباشرة، لسببين:
 *   1) Google Directions API (REST endpoint) مش بيسمح بـ CORS من المتصفح.
 *   2) مفتاح الـ API هنا سري (GOOGLE_MAPS_API_KEY من غير NEXT_PUBLIC_)
 *      عشان محدش يقدر ياخده من الـ Network tab ويستخدمه في حاجة تانية.
 *
 * ليه بنجرب كل مطعم كنقطة بداية؟
 * -------------------------------------------------------------
 * خاصية "optimize:true" في Google Directions API بترتب بس النقط اللي
 * بين نقطة البداية (origin) ونقطة النهاية (destination) — مش بتغيّر
 * نقطة البداية نفسها. يعني لو ثبّتنا "أول مطعم في السلة" كنقطة بداية
 * دايمًا، ممكن يطلع مسار أطول من اللازم لو في مطعم تاني كان الأنسب
 * إنه يبقى البداية. عشان نضمن فعلاً أقصر مسار من بين كل الاحتمالات،
 * بنجرب كل مطعم كبداية على حدة (كل محاولة بترتب الباقي تلقائيًا)،
 * وبعدين بنختار المحاولة اللي مسافتها الإجمالية أقل.
 *
 * @param {Array<{lat:number,lng:number}>} restaurants - إحداثيات كل مطعم في الأوردر
 * @param {{lat:number,lng:number}} customer - إحداثيات العميل
 * @returns {Promise<{
 *   distanceKm: string,
 *   durationMins: number,
 *   restaurantOrder: number[],
 *   overviewPolyline: string|null,
 *   legs: Array<{startAddress:string, endAddress:string, distanceMeters:number, durationSeconds:number}>
 * }>}
 */
export async function calculateOptimizedDeliveryRoute(restaurants, customer) {
  if (!restaurants || restaurants.length === 0) {
    throw new Error("لازم مطعم واحد على الأقل");
  }

  const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  if (!GOOGLE_API_KEY) {
    throw new Error("GOOGLE_MAPS_API_KEY مش موجود في متغيرات البيئة");
  }

  // نجرب كل مطعم كنقطة بداية (لو مطعم واحد بس، فيه محاولة واحدة طبيعي)
  const attempts = await Promise.all(
    restaurants.map((_, originIndex) =>
      fetchRouteForOrigin(restaurants, originIndex, customer, GOOGLE_API_KEY)
    )
  );

  // نختار المحاولة اللي مسافتها الإجمالية (بالمتر) أقل من غيرها
  const best = attempts.reduce((a, b) =>
    b.totalDistanceMeters < a.totalDistanceMeters ? b : a
  );

  const { totalDistanceMeters, ...result } = best;
  return result;
}

/**
 * بتحسب المسار لو ثبّتنا مطعم معين (originIndex) كنقطة بداية، وسيبنا
 * جوجل يرتب باقي المطاعم تلقائيًا (optimize:true) قبل ما يوصل للعميل.
 */
async function fetchRouteForOrigin(restaurants, originIndex, customer, apiKey) {
  const origin = restaurants[originIndex];
  const otherIndices = restaurants.map((_, i) => i).filter((i) => i !== originIndex);
  const others = otherIndices.map((i) => restaurants[i]);

  const originParam = `${origin.lat},${origin.lng}`;
  const destinationParam = `${customer.lat},${customer.lng}`;

  let waypointsParam = "";
  if (others.length > 0) {
    const waypoints = others.map((r) => `${r.lat},${r.lng}`).join("|");
    waypointsParam = `&waypoints=optimize:true|${waypoints}`;
  }

  const url =
    `https://maps.googleapis.com/maps/api/directions/json` +
    `?origin=${originParam}&destination=${destinationParam}${waypointsParam}&key=${apiKey}`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status !== "OK") {
    throw new Error(`Google Maps API Error: ${data.status}`);
  }

  const route = data.routes[0];
  let totalDistanceMeters = 0;
  let totalDurationSeconds = 0;

  route.legs.forEach((leg) => {
    totalDistanceMeters += leg.distance.value;
    totalDurationSeconds += leg.duration.value;
  });

  // جوجل بيرجع waypoint_order كـ index جوه مصفوفة "others" بس (0, 1, 2...)
  // بنحولها لـ index في مصفوفة "restaurants" الأصلية عشان تبقى مفيدة
  // لأي حد هيستخدم النتيجة (زي بناء لينك خرائط جوجل بعد كده)
  const localOrder = route.waypoint_order?.length ? route.waypoint_order : others.map((_, i) => i);
  const restaurantOrder = [originIndex, ...localOrder.map((localIdx) => otherIndices[localIdx])];

  return {
    totalDistanceMeters,
    distanceKm: (totalDistanceMeters / 1000).toFixed(2),
    durationMins: Math.round(totalDurationSeconds / 60),
    // ترتيب زيارة المطاعم الكامل (indices بالنسبة لمصفوفة restaurants
    // الأصلية اللي بعتها)، من أول مطعم يتزار لآخر واحد قبل العميل
    restaurantOrder,
    overviewPolyline: route.overview_polyline?.points || null,
    legs: route.legs.map((leg) => ({
      startAddress: leg.start_address,
      endAddress: leg.end_address,
      distanceMeters: leg.distance.value,
      durationSeconds: leg.duration.value,
    })),
  };
}

/**
 * بتبني لينك جاهز يفتح خرائط جوجل (تطبيق أو ويب) برحلة واحدة فيها كل
 * محطات التوصيل (المطاعم) بالترتيب الأمثل (restaurantOrder) وصولًا
 * للعميل — من غير ما يحتاج أي مفتاح API، لأن ده مجرد رابط عادي
 * (Google Maps URL scheme).
 *
 * دالة "نضيفة" (pure) تشتغل في المتصفح أو السيرفر، مافيهاش fetch.
 *
 * @param {Array<{lat:number,lng:number}>} restaurants - إحداثيات المطاعم (بنفس الترتيب اللي اتبعت بيه لـ calculateOptimizedDeliveryRoute)
 * @param {{lat:number,lng:number}} customer - إحداثيات العميل
 * @param {number[]} [restaurantOrder] - ترتيب الزيارة الأمثل من calculateOptimizedDeliveryRoute
 *   (اختياري؛ لو مش موجود، بيستخدم الترتيب الأصلي زي ما هو)
 * @returns {string|null}
 */
export function buildGoogleMapsDirectionsUrl(restaurants, customer, restaurantOrder) {
  if (!restaurants || restaurants.length === 0 || !customer) return null;

  const orderedRestaurants =
    restaurantOrder && restaurantOrder.length === restaurants.length
      ? restaurantOrder.map((i) => restaurants[i])
      : restaurants;

  const origin = `${orderedRestaurants[0].lat},${orderedRestaurants[0].lng}`;
  const destination = `${customer.lat},${customer.lng}`;

  const stops = orderedRestaurants.slice(1);
  const waypointsParam = stops.length
    ? `&waypoints=${stops.map((r) => `${r.lat},${r.lng}`).join("|")}`
    : "";

  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypointsParam}&travelmode=driving`;
}
