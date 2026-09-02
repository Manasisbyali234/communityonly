import { User } from '../types';

type StoredUser = User & {
  passwordHash: string;
  passwordSalt: string;
};

type PublicUser = Omit<StoredUser, 'passwordHash' | 'passwordSalt'>;

type RegisterBody = {
  email?: string;
  password?: string;
  username?: string;
  displayName?: string;
  referredById?: string;
};

type LoginBody = {
  email?: string;
  password?: string;
};

type RefreshBody = {
  refreshToken?: string;
};

type AuthStore = {
  users: StoredUser[];
  refreshTokens: Map<string, string>;
};

const globalStore = globalThis as typeof globalThis & {
  __communityAuthStore?: AuthStore;
};

function getStore(): AuthStore {
  if (!globalStore.__communityAuthStore) {
    globalStore.__communityAuthStore = {
      users: [],
      refreshTokens: new Map<string, string>(),
    };
  }
  return globalStore.__communityAuthStore;
}

function jsonResponse(status: number, body: unknown) {
  return Response.json(body, { status });
}

function success<T>(message: string, data: T, status = 200) {
  return jsonResponse(status, { success: true, message, data });
}

function failure(status: number, message: string) {
  return jsonResponse(status, { success: false, message, data: null });
}

function normalizeEmail(email?: string) {
  return email?.trim().toLowerCase() ?? '';
}

function normalizeUsername(username?: string) {
  return username?.trim().toLowerCase() ?? '';
}

function validatePassword(password: string) {
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must contain at least one special character';
  return null;
}

function validateRegister(body: RegisterBody) {
  const email = normalizeEmail(body.email);
  const username = normalizeUsername(body.username);
  const password = body.password ?? '';

  if (!username || username.length < 3) return 'Username must be at least 3 characters';
  if (username.length > 16) return 'Username must be under 16 characters';
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username can only contain letters, numbers, and underscores';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address';

  return validatePassword(password);
}

async function sha256(input: string) {
  const bytes = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hashPassword(password: string, salt: string) {
  return sha256(`${salt}:${password}`);
}

function token(prefix: 'access' | 'refresh', userId: string) {
  return `${prefix}_${userId}_${crypto.randomUUID().replace(/-/g, '')}`;
}

function publicUser(user: StoredUser): PublicUser {
  const { passwordHash, passwordSalt, ...safeUser } = user;
  return safeUser;
}

function createSession(user: StoredUser) {
  const accessToken = token('access', user.id);
  const refreshToken = token('refresh', user.id);
  getStore().refreshTokens.set(refreshToken, user.id);
  return {
    user: publicUser(user),
    accessToken,
    refreshToken,
  };
}

async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function register(request: Request) {
  const body = await readJson<RegisterBody>(request);
  if (!body) return failure(400, 'Invalid request body');

  const validationMessage = validateRegister(body);
  if (validationMessage) return failure(400, validationMessage);

  const store = getStore();
  const email = normalizeEmail(body.email);
  const username = normalizeUsername(body.username);

  if (store.users.some((user) => normalizeEmail(user.email) === email)) {
    return failure(409, 'Email is already registered');
  }

  if (store.users.some((user) => user.username === username)) {
    return failure(409, 'Username is already taken');
  }

  const now = new Date().toISOString();
  const passwordSalt = crypto.randomUUID();
  const user: StoredUser = {
    id: crypto.randomUUID(),
    email,
    username,
    displayName: body.displayName?.trim() || username,
    role: 'USER',
    isVerified: true,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    followersCount: 0,
    followingCount: 0,
    communitiesCount: 0,
    helpCount: 0,
    attendedEventCount: 0,
    passwordSalt,
    passwordHash: await hashPassword(body.password ?? '', passwordSalt),
    ...(body.referredById ? { bio: `Referred by ${body.referredById}` } : {}),
  };

  store.users.push(user);
  return success('Registration successful', createSession(user), 201);
}

export async function login(request: Request) {
  const body = await readJson<LoginBody>(request);
  if (!body) return failure(400, 'Invalid request body');

  const email = normalizeEmail(body.email);
  const password = body.password ?? '';
  const user = getStore().users.find((candidate) => normalizeEmail(candidate.email) === email);

  if (!user || user.passwordHash !== await hashPassword(password, user.passwordSalt)) {
    return failure(401, 'Invalid email or password');
  }

  return success('Login successful', createSession(user));
}

export async function refresh(request: Request) {
  const body = await readJson<RefreshBody>(request);
  if (!body?.refreshToken) return failure(400, 'Refresh token is required');

  const store = getStore();
  const userId = store.refreshTokens.get(body.refreshToken);
  const user = store.users.find((candidate) => candidate.id === userId);

  if (!user) return failure(401, 'Invalid refresh token');

  store.refreshTokens.delete(body.refreshToken);
  return success('Token refreshed', createSession(user));
}

