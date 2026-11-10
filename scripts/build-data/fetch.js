import fs from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import seven from "7zip-bin";
import { fileURLToPath } from "node:url";
export const root = fileURLToPath(new URL("../../", import.meta.url));
export const raw = new URL("../../data/raw/", import.meta.url);
const pin = "e0c538a1e41ae5eace454d2818902e1065608e16";
export async function sha(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}
export async function fetchSources() {
  await fs.mkdir(raw, { recursive: true });
  const records = JSON.parse(
    await fs.readFile(new URL("manifest.json", raw), "utf8").catch(() => "{}"),
  );
  async function download(
    name,
    url,
    license,
    sourceDate = null,
    digest = null,
  ) {
    const file = new URL(name, raw);
    const exists = await fs.stat(file).then(
      () => true,
      () => false,
    );
    if (!exists || !records[name] || process.argv.includes("--refresh")) {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(180000),
      });
      if (!response.ok)
        throw Error(`Dataset download failed (${response.status}): ${url}`);
      const temp = new URL(name + ".part", raw);
      await pipeline(Readable.fromWeb(response.body), createWriteStream(temp));
      const hash = await sha(temp);
      if (digest && digest !== `sha256:${hash}`)
        throw Error(`Checksum mismatch: ${name}`);
      await fs.rename(temp, file);
      records[name] = {
        url,
        license,
        sourceDate,
        retrievedAt: new Date().toISOString(),
        sha256: hash,
        bytes: (await fs.stat(file)).size,
      };
    } else if ((await sha(file)) !== records[name].sha256)
      throw Error(`Raw cache changed: ${name}; rerun data:fetch -- --refresh`);
    console.log(`Source ${name}: ${records[name].bytes} bytes`);
  }
  for (const name of ["stations", "trains", "schedules"])
    await download(
      `${name}.json`,
      `https://raw.githubusercontent.com/datameet/railways/${pin}/${name}.json`,
      "CC0",
      "2016-08-08",
    );
  await download(
    "regions.csv",
    "https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/regions.csv",
    "Public domain",
  );
  await download(
    "airports.csv",
    "https://raw.githubusercontent.com/davidmegginson/ourairports-data/main/airports.csv",
    "Public domain",
  );
  for (const name of ["airports", "routes"])
    await download(
      `${name}.dat`,
      `https://raw.githubusercontent.com/jpatokal/openflights/master/data/${name}.dat`,
      "ODbL 1.0; individual contents DbCL 1.0",
      name === "routes" ? "2014-06" : null,
    );
  if (
    !records["lgd-states.csv"] ||
    !records["lgd-districts.csv"] ||
    process.argv.includes("--refresh")
  ) {
    const r = await fetch(
      "https://api.github.com/repos/ramSeraph/opendata/releases/tags/lgd-latest",
      { signal: AbortSignal.timeout(30000) },
    );
    if (!r.ok) throw Error("LGD release discovery failed");
    const release = await r.json();
    const dates = new Map();
    for (const asset of release.assets || []) {
      const match =
        /^(states|districts)\.(\d{2}[A-Za-z]{3}\d{4})\.csv\.7z$/.exec(
          asset.name,
        );
      if (match) {
        const date = new Date(
          match[2].replace(/(\d{2})([A-Za-z]{3})(\d{4})/, "$1 $2 $3"),
        );
        if (date <= new Date()) {
          const key = date.toISOString().slice(0, 10);
          dates.set(key, { ...dates.get(key), [match[1]]: asset });
        }
      }
    }
    const date = [...dates.keys()]
      .filter((d) => dates.get(d).states && dates.get(d).districts)
      .sort()
      .at(-1);
    if (!date) throw Error("No complete LGD state/district source pair");
    for (const level of ["states", "districts"]) {
      const asset = dates.get(date)[level];
      await download(
        `${level}.7z`,
        asset.browser_download_url,
        "GODL-India (LGD data; community mirror)",
        date,
        asset.digest,
      );
      const csv = execFileSync(
        seven.path7za,
        ["e", "-so", fileURLToPath(new URL(`${level}.7z`, raw))],
        { maxBuffer: 16 * 1024 * 1024 },
      );
      const name = `lgd-${level}.csv`;
      await fs.writeFile(new URL(name, raw), csv);
      records[name] = {
        ...records[`${level}.7z`],
        archiveSha256: records[`${level}.7z`].sha256,
        sha256: await sha(new URL(name, raw)),
        bytes: csv.length,
      };
    }
  }
  for (const level of ["states", "districts"])
    if (
      (await sha(new URL(`lgd-${level}.csv`, raw))) !==
      records[`lgd-${level}.csv`].sha256
    )
      throw Error("LGD CSV cache checksum mismatch");
  await fs.writeFile(
    new URL("manifest.json", raw),
    JSON.stringify(records, null, 2) + "\n",
  );
  return records;
}
if (process.argv[1] === fileURLToPath(import.meta.url))
  fetchSources().catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
