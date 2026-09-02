import { refresh } from '../../../../server/authBackend';

export async function POST(request: Request) {
  return refresh(request);
}

