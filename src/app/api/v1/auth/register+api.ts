import { register } from '../../../../server/authBackend';

export async function POST(request: Request) {
  return register(request);
}

