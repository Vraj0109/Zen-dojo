#!/usr/bin/env node
import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const privateKeyPath = resolve(__dirname, "../packages/sync-worker/jwt-private.jwk.json");

const force = process.argv.includes("--force");

if (existsSync(privateKeyPath) && !force) {
  console.error(`Error: ${privateKeyPath} already exists. Pass --force to overwrite.`);
  process.exit(1);
}

const keyPair = await crypto.subtle.generateKey(
  {
    name: "ECDSA",
    namedCurve: "P-256",
  },
  true,
  ["sign", "verify"],
);

const privateJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);
const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);

// Write private JWK to packages/sync-worker/jwt-private.jwk.json
await writeFile(privateKeyPath, JSON.stringify(privateJwk, null, 2) + "\n", {
  encoding: "utf8",
  mode: 0o600,
});

// NEVER print private key! Print only public JWK.
console.log(JSON.stringify(publicJwk, null, 2));
