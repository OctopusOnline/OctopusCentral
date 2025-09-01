import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const rootDir = process.cwd();
const controllerPackagePath = path.join(rootDir, 'packages/controller/package.json');
const imageDir = path.join(rootDir, 'images/controller/src');
const imagePackagePath = path.join(imageDir, 'package.json');
const imageLockPath = path.join(imageDir, 'package-lock.json');

const controllerPackage = JSON.parse(fs.readFileSync(controllerPackagePath, 'utf8'));
const newVersion = controllerPackage.version;

const imagePackage = JSON.parse(fs.readFileSync(imagePackagePath, 'utf8'));
const oldVersion = imagePackage.dependencies['@octopuscentral/controller'];

if (newVersion === oldVersion) {
    console.log('No version change detected.');
    process.exit(0);
}

imagePackage.dependencies['@octopuscentral/controller'] = newVersion;
fs.writeFileSync(imagePackagePath, JSON.stringify(imagePackage, null, 2) + '\n', 'utf8');

process.chdir(imageDir);
execSync('npm cache clean --force', { stdio: 'inherit' });
execSync('npm install', { stdio: 'inherit' });

process.chdir(rootDir);

const diff = execSync(`git diff --name-only ${imagePackagePath} ${imageLockPath}`).toString().trim();
if (!diff) {
    console.log('No changes to commit.');
    process.exit(0);
}

execSync(`git add ${imagePackagePath} ${imageLockPath}`);
execSync(`git commit -m "Update controller image to v${newVersion}"`, { stdio: 'inherit' });
execSync('git push', { stdio: 'inherit' });