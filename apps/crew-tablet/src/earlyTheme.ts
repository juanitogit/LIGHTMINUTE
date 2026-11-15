// Run before the UI paints so a saved theme is applied without a flash.
try {
  if (localStorage.getItem("lightminute-design-version") === "2") {
    const theme = localStorage.getItem("lightminute-theme");
    if (theme === "dark" || theme === "light") document.documentElement.dataset.theme = theme;
  }
} catch { /* storage can be disabled */ }
