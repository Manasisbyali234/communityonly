import { login } from '../../../../server/authBackend';

export async function POST(request: Request) {
  return login(request);
}

