import "dotenv/config";

/**
 * Admin dashboard intentionally does not seed or truncate shared production data.
 * Run the main application's seed once when a fresh database needs reference data.
 */
async function main() {
  console.log("Admin dashboard seed skipped: shared database is owned by the main app.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
