import { loadData } from "../../server/data/index.js";
try {
  const d = loadData();
  console.log(
    JSON.stringify(
      {
        counts: d.report.processedCounts,
        sourceCounts: d.report.sourceCounts,
        perState: d.report.perState,
        isolatedJunctions: d.report.isolatedJunctions,
        unassignedMajorJunctions: d.report.unassignedMajorJunctions,
        samples: d.report.samples,
        graphBytes: d.report.graphBytes,
      },
      null,
      2,
    ),
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
