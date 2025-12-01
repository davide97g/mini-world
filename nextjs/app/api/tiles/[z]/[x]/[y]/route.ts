export async function GET(
  req: Request,
  { params }: { params: Promise<{ z: string; x: string; y: string }> }
) {
  const { z, x, y } = await params;
  const url = `https://tile.openstreetmap.org/${z}/${x}/${y}.png`;

  const tile = await fetch(url);
  const arrayBuffer = await tile.arrayBuffer();

  return new Response(arrayBuffer, {
    headers: { "Content-Type": "image/png" }
  });
}

