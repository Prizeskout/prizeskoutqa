export function requireDatabaseUrl(): string {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is required. Set it in your local environment or secret manager; never commit it.",
    );
  }

  return databaseUrl;
}
