const config = {
  timeout: 60_000,
  use: {
    browserName: "chromium",
    headless: true,
    viewport: {
      width: 1440,
      height: 900
    },
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  }
};

export default config;
