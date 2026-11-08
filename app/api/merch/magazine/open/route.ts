import { MerchApiError, merchApi } from "@/lib/api/merch";
import { errorResponse, readJson } from "@/lib/api/route-helpers";
import { isDeviceId, isMagazineRef, parseMagazineSession } from "@/lib/merch/magazine";

/** Open a paid order's magazines on this device (the first device is the only one). */
export async function POST(request: Request) {
  try {
    const body = await readJson(request);
    const ref = typeof body.ref === "string" ? body.ref.trim() : "";
    if (!isMagazineRef(ref)) throw new MerchApiError("Enter the order code from your receipt.", 400);
    if (!isDeviceId(body.device)) throw new MerchApiError("Reload the page and try again.", 400);
    const session = parseMagazineSession(await merchApi("magazine/open/", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ref, device: body.device }),
    }));
    if (!session) throw new MerchApiError("The magazine couldn’t be opened. Try again.");
    return Response.json(session, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error, "The magazine couldn’t be opened.");
  }
}
