import { createClient } from "@/lib/supabase/server";
import { DemoClient } from "./DemoClient";

async function getCoverPhoto() {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("cities")
      .select("name, cover_photo")
      .not("cover_photo", "is", null)
      .limit(1)
      .single();
    return data;
  } catch {
    return null;
  }
}

export default async function DemoPage() {
  const city = await getCoverPhoto();
  return <DemoClient cityName={city?.name ?? "Portland"} coverPhoto={city?.cover_photo ?? null} />;
}
