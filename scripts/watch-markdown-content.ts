import "dotenv/config";
import { watch, type FSWatcher } from "node:fs";
import { join, relative } from "node:path";
import { CONTENT_DIRECTORIES, disconnectContentSync, syncMarkdownContent } from "./content-sync-lib";

const WATCH_EXTENSIONS = new Set([".md"]);
const WATCH_IGNORED_PREFIX = "_";
const DEBOUNCE_MS = 500;

let debounceTimer: NodeJS.Timeout | null = null;
let syncInFlight = false;
let syncQueued = false;

function shouldHandleChange(fileName: string | null) {
  if (!fileName) {
    return true;
  }

  const normalized = fileName.toLowerCase();
  const extensionIndex = normalized.lastIndexOf(".");
  return extensionIndex === -1 || WATCH_EXTENSIONS.has(normalized.slice(extensionIndex));
}

function scheduleSync(reason: string) {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }

  debounceTimer = setTimeout(() => {
    void runSync(reason);
  }, DEBOUNCE_MS);
}

async function runSync(reason: string) {
  if (syncInFlight) {
    syncQueued = true;
    return;
  }

  syncInFlight = true;

  try {
    console.log(`[content:watch] Syncing because ${reason}...`);
    const result = await syncMarkdownContent();
    console.log(
      `[content:watch] Synced ${result.blogProcessed} blog file(s), ${result.notesProcessed} note file(s), and ${result.journalProcessed} journal file(s).`,
    );
  } catch (error) {
    console.error("[content:watch] Sync failed.");
    console.error(error);
  } finally {
    syncInFlight = false;

    if (syncQueued) {
      syncQueued = false;
      scheduleSync("changes continued during the last sync");
    }
  }
}

function createWatcher(directory: string) {
  const watcher = watch(directory, { recursive: true }, (eventType, fileName) => {
    const relativePath = fileName
      ? relative(CONTENT_DIRECTORIES.root, join(directory, fileName))
      : relative(CONTENT_DIRECTORIES.root, directory);

    if (fileName && fileName.split(/[\\/]/).some((segment) => segment.startsWith(WATCH_IGNORED_PREFIX))) {
      return;
    }

    if (!shouldHandleChange(fileName)) {
      return;
    }

    scheduleSync(`${eventType} on ${relativePath}`);
  });

  watcher.on("error", (error) => {
    console.error(`[content:watch] Watch error in ${directory}`);
    console.error(error);
  });

  return watcher;
}

async function main() {
  console.log("[content:watch] Watching content/blog, content/notes, and content/journal for Markdown changes...");
  await runSync("startup");

  const watchers: FSWatcher[] = [
    createWatcher(CONTENT_DIRECTORIES.blog),
    createWatcher(CONTENT_DIRECTORIES.notes),
    createWatcher(CONTENT_DIRECTORIES.journal),
  ];

  const closeWatchers = async () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    for (const watcher of watchers) {
      watcher.close();
    }

    await disconnectContentSync();
  };

  const handleExit = async () => {
    await closeWatchers();
    process.exit(0);
  };

  process.on("SIGINT", () => {
    void handleExit();
  });

  process.on("SIGTERM", () => {
    void handleExit();
  });
}

main().catch(async (error) => {
  console.error("[content:watch] Failed to start watcher.");
  console.error(error);
  await disconnectContentSync();
  process.exitCode = 1;
});
