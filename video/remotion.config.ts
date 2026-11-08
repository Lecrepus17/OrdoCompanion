import fs from 'node:fs';
import { Config } from '@remotion/cli/config';

const BROWSER_CANDIDATES = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
];

const foundBrowser = BROWSER_CANDIDATES.find((candidate) => fs.existsSync(candidate));
if (foundBrowser) {
  Config.setBrowserExecutable(foundBrowser);
}

Config.setVideoImageFormat('jpeg');
Config.setJpegQuality(90);
Config.setConcurrency(2);
Config.setOverwriteOutput(true);
