import "dotenv/config";
import { generateWeeklyDigest } from "../lib/digests";

async function main() {
  const result = await generateWeeklyDigest();

  console.log(
    JSON.stringify(
      {
        slug: result.digest.slug,
        title: result.digest.title,
        paperCount: result.stats.paperCount,
        journalCount: result.stats.journalCount,
        postCount: result.stats.postCount,
        topicCount: result.stats.topicCount,
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