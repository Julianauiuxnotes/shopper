// Extends app.json dynamically. Local dev (`expo start --web`) serves
// from "/", so it must keep no baseUrl — only the GitHub Pages build
// (app/shopper repo, served at /shopper/) needs routes/assets prefixed,
// so the CI workflow sets EXPO_PUBLIC_BASE_URL before exporting rather
// than this being hardcoded into app.json for every environment.
module.exports = ({ config }) => {
  const baseUrl = process.env.EXPO_PUBLIC_BASE_URL;
  if (!baseUrl) return config;
  return {
    ...config,
    experiments: {
      ...config.experiments,
      baseUrl,
    },
  };
};
