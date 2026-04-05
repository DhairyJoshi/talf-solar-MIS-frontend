
import { User, UserRole } from "../types";

const SESSION_STORAGE_KEY = 'helios_mis_current_user';

// --- MOCK USER DATABASE ---
// In a real application, this would be a secure backend service.
const mockUsers: Record<string, { pass: string, role: UserRole }> = {
  'admin': { pass: 'password', role: 'admin' },
  'ops': { pass: 'password', role: 'operations' },
  'viewer': { pass: 'password', role: 'viewer' },
};
// -------------------------


/**
 * Simulates a login request.
 * @param username The username.
 * @param pass The password.
 * @returns A promise that resolves to the User object on success, or null on failure.
 */
export const login = (username: string, pass: string): Promise<User | null> => {
  return new Promise((resolve) => {
    // Simulate network delay
    setTimeout(() => {
      const dbUser = mockUsers[username.toLowerCase()];
      if (dbUser && dbUser.pass === pass) {
        const user: User = {
          username: username,
          role: dbUser.role,
        };
        // Store user in session storage for persistence across reloads
        try {
          sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
        } catch (e) {
          console.error("Could not save user to session storage", e);
        }
        resolve(user);
      } else {
        resolve(null);
      }
    }, 500);
  });
};

/**
 * Logs the current user out by clearing session storage.
 */
export const logout = (): void => {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (e) {
    console.error("Could not remove user from session storage", e);
  }
};

/**
 * Retrieves the current user from session storage.
 * @returns The User object if logged in, otherwise null.
 */
export const getCurrentUser = (): User | null => {
  try {
    const storedUser = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (storedUser) {
      return JSON.parse(storedUser);
    }
    return null;
  } catch (e) {
    console.error("Could not retrieve user from session storage", e);
    return null;
  }
};
