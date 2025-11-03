#!/usr/bin/env node
import { env, exit } from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';

const DEFAULT_REGISTRY = 'https://registry.npmjs.org/';
const registry = (env.PNPM_REGISTRY || env.NPM_CONFIG_REGISTRY || DEFAULT_REGISTRY).trim();
const samplePackage = '%40types%2Fnode';
const target = registry.endsWith('/') ? `${registry}${samplePackage}` : `${registry}/${samplePackage}`;

async function main() {
  const controller = new AbortController();
  const timeout = Number.parseInt(env.REGISTRY_CHECK_TIMEOUT ?? '10000', 10);
  const timer = delay(timeout).then(() => controller.abort());

  try {
    const response = await fetch(target, {
      method: 'GET',
      headers: {
        'user-agent': 'hooshgate-registry-check/1.0',
        accept: 'application/json',
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      console.error(`Registry check failed (${response.status} ${response.statusText}).`);
      console.error(`Tried to reach: ${target}`);
      console.error('The environment is blocking outbound traffic or requires a custom proxy/registry.');
      console.error('Set PNPM_REGISTRY to an accessible mirror or configure HTTPS_PROXY before running `pnpm install`.');
      exit(1);
    }

    console.log(`Registry check succeeded for ${target}`);
    console.log('You can proceed with `pnpm install`.');
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error(`Registry check timed out after ${timeout}ms.`);
    } else {
      console.error('Failed to reach the configured registry.');
      console.error(error instanceof Error ? error.message : String(error));
    }
    console.error('Provide PNPM_REGISTRY or proxy settings that are reachable from this environment.');
    exit(1);
  } finally {
    controller.abort();
    await timer.catch(() => {});
  }
}

main();
