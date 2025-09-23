#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const rootDir = process.cwd();

const controllerPackagePath = path.join(rootDir, 'packages/controller/package.json');
const controllerImageDir = path.join(rootDir, 'images/controller/src');
const controllerImagePackagePath = path.join(controllerImageDir, 'package.json');
const controllerImageLockPath = path.join(controllerImageDir, 'package-lock.json');

const centralPackagePath = path.join(rootDir, 'packages/central/package.json');
const centralImageDir = path.join(rootDir, 'images/central/src');
const centralImagePackagePath = path.join(centralImageDir, 'package.json');
const centralImageLockPath = path.join(centralImageDir, 'package-lock.json');

const controllerPackage = JSON.parse(fs.readFileSync(controllerPackagePath, 'utf8'));
const newControllerVersion = controllerPackage.version;
const controllerImagePackage = JSON.parse(fs.readFileSync(controllerImagePackagePath, 'utf8'));
const oldControllerVersion = controllerImagePackage.dependencies['@octopuscentral/controller'];
const controllerNeedsUpdate = newControllerVersion !== oldControllerVersion;

const centralPackage = JSON.parse(fs.readFileSync(centralPackagePath, 'utf8'));
const newCentralVersion = centralPackage.version;
const centralImagePackage = JSON.parse(fs.readFileSync(centralImagePackagePath, 'utf8'));
const oldCentralVersion = centralImagePackage.dependencies['@octopuscentral/central'];
const centralNeedsUpdate = newCentralVersion !== oldCentralVersion;


if (!controllerNeedsUpdate && !centralNeedsUpdate) {
    console.log('No version change detected.');
    process.exit(0);
}

const filesToCommit = [];
const commitMessages = [];

if (controllerNeedsUpdate) {
    console.log(`Updating controller image to v${newControllerVersion}`);
    controllerImagePackage.dependencies['@octopuscentral/controller'] = newControllerVersion;
    fs.writeFileSync(controllerImagePackagePath, JSON.stringify(controllerImagePackage, null, 2) + '\n', 'utf8');

    process.chdir(controllerImageDir);
    execSync('npm cache clean --force', { stdio: 'inherit' });
    execSync('npm install', { stdio: 'inherit' });
    process.chdir(rootDir);

    filesToCommit.push(controllerImagePackagePath, controllerImageLockPath);
    commitMessages.push(`Update controller image to v${newControllerVersion}`);
}

if (centralNeedsUpdate) {
    console.log(`Updating central image to v${newCentralVersion}`);
    centralImagePackage.dependencies['@octopuscentral/central'] = newCentralVersion;
    fs.writeFileSync(centralImagePackagePath, JSON.stringify(centralImagePackage, null, 2) + '\n', 'utf8');

    process.chdir(centralImageDir);
    execSync('npm cache clean --force', { stdio: 'inherit' });
    execSync('npm install', { stdio: 'inherit' });
    process.chdir(rootDir);

    filesToCommit.push(centralImagePackagePath, centralImageLockPath);
    commitMessages.push(`Update central image to v${newCentralVersion}`);
}

const diff = execSync(`git diff --name-only ${filesToCommit.join(' ')}`).toString().trim();
if (!diff) {
    console.log('No changes to commit.');
    process.exit(0);
}

execSync(`git add ${filesToCommit.join(' ')}`);
execSync(`git commit -m "${commitMessages.join(' & ')}"`, { stdio: 'inherit' });
execSync('git push', { stdio: 'inherit' });
