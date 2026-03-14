import "dotenv/config";
import { syncAllPaperTopics } from "../lib/papers";

async function main() {
  const result = await syncAllPaperTopics();

  console.log(
    JSON.stringify(
      {
        syncedTopics: result.topicCount,
        syncedPapers: result.paperCount,
        details: result.results.map((item) => ({
          topic: item.topicName,
          papers: item.count,
          digestDate: item.digestDate.toISOString(),
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});