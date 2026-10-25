export interface RemoteVersionManifest {
  version: string;
  minVersion?: string;
  releaseName?: string;
  releaseDate?: string;
  downloadUrl: string;
  apkUrl?: string;
  changelog: string[] | string;
  forceUpdate?: boolean;
}

export interface UpdateCheckResult {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseDate?: string;
  changelog: string[];
  downloadUrl: string;
  apkUrl?: string;
  isMandatory: boolean;
  isDismissed: boolean;
}

export interface GitHubReleaseAsset {
  name: string;
  browser_download_url: string;
  content_type?: string;
  size?: number;
}

export interface GitHubReleaseResponse {
  tag_name: string;
  name: string;
  body: string;
  html_url: string;
  published_at?: string;
  assets?: GitHubReleaseAsset[];
}
