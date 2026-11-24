import { lookupFreeFireUid } from '../../src/utils/ffUidLookup';

export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const rawUid = url.searchParams.get('uid') ?? '';
  const result = await lookupFreeFireUid(rawUid);

  return new Response(JSON.stringify(result.body), {
    status: result.status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
};
