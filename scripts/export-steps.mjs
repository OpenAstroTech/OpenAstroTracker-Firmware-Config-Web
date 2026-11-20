// Exports the wizard step definitions to public/steps.json, so the site serves them at /steps.json for
// OATControl's firmware flasher. Runs automatically before `npm start` and `npm run build`.
//
// Every "condition" string is also exported as "conditionTree", parsed by parser.js, so OATControl only has to
// evaluate the trees and never re-implements the parser.
//
// Bump SCHEMA_VERSION when the step format changes in a way an older OATControl can't handle (for example a new
// control type); OATControl then keeps its own copy instead of using this file.
//
// The live server runs Node 13.12 (see the Dockerfile), so the step files and parser.js must not use newer syntax
// such as ?. or ?? (the browser build accepts it, this export would fail). A failed export doesn't stop the site:
// /steps.json keeps the last generated version, and OATControl falls back to its own copy.
//
// Usage: node scripts/export-steps.mjs [output.json]   (default: public/steps.json)

import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const SCHEMA_VERSION = 1;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outFile = process.argv[2] || path.join(root, 'public', 'steps.json');

// The site's .js files use ES module syntax without "type": "module" in package.json (Create React App doesn't
// need it). Only Node 22 detects that by itself, and the server runs Node 13, so load a copy from a temp folder
// marked as ES modules.
const copyDir = (from, to) => {
    fs.mkdirSync(to, { recursive: true });
    for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
        const src = path.join(from, entry.name);
        const dst = path.join(to, entry.name);
        if (entry.isDirectory()) {
            copyDir(src, dst);
        } else if (entry.name.endsWith('.js')) {
            fs.copyFileSync(src, dst);
        }
    }
};

const removeDir = (dir) => (fs.rmSync ? fs.rmSync(dir, { recursive: true, force: true }) : fs.rmdirSync(dir, { recursive: true }));

const toPlain = (expr) => (typeof expr === 'object' && expr !== null)
    ? { lhs: toPlain(expr.lhs), op: expr.op, rhs: toPlain(expr.rhs) }
    : expr;

async function main() {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'oat-steps-'));
    try {
        copyDir(path.join(root, 'src', 'modules'), tempDir);
        fs.writeFileSync(path.join(tempDir, 'package.json'), '{ "type": "module" }');
        await exportSteps((rel) => import(pathToFileURL(path.join(tempDir, rel)).href));
    } finally {
        try {
            removeDir(tempDir);
        } catch (err) {
            console.warn(`Could not remove ${tempDir}: ${err.message}`);
        }
    }
}

async function exportSteps(load) {
    const { getStepsForTracker } = await load('configurations/index.js');
    const { Defaults } = await load('configurations/base/sharedDefaults.js');
    const { parseExpression } = await load('parser.js');

    const addConditionTrees = (node) => {
        if (Array.isArray(node)) {
            node.forEach(addConditionTrees);
        } else if (typeof node === 'object' && node !== null) {
            for (const value of Object.values(node)) {
                addConditionTrees(value);
            }
            if (typeof node.condition === 'string') {
                node.conditionTree = toPlain(parseExpression(node.condition));
            }
        }
    };

    const trackers = {};
    for (const tracker of ['OAT', 'OAM', 'OAE']) {
        const steps = getStepsForTracker(tracker);
        addConditionTrees(steps);
        trackers[tracker] = steps;
    }

    const sourceVersion = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
    const result = { schemaVersion: SCHEMA_VERSION, sourceVersion, defaults: Defaults, trackers };
    fs.writeFileSync(outFile, JSON.stringify(result, null, 2) + '\n');
    console.log(`Wrote ${outFile}: ` + Object.entries(trackers).map(([k, v]) => `${k}=${v.length} steps`).join(', '));
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
