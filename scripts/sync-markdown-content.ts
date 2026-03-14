import { disconnectContentSync, syncMarkdownContent } from "./content-sync-lib";

async function main() {
  const result = await syncMarkdownContent();
  console.log(
    `Synced ${result.blogProcessed} blog file(s), ${result.notesProcessed} note file(s), and ${result.journalProcessed} journal file(s).`,
  );
}

main()
  .catch((error) => {
    console.error("Markdown content sync failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectContentSync();
  });
