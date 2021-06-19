export function gen_version_text() {
  return process?.env?.npm_package_version
    ? `v${process.env.npm_package_version}` +
        (process?.env?.BUILD_VERSION ? `+${process.env.BUILD_VERSION}` : "")
    : "(dev version)";
}
