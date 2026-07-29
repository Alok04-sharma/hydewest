const buildQuery = ({ latitude, longitude, nickname }) => {
  const params = new URLSearchParams({ action: "setPickup", "pickup[my_location]": "true" });
  if (Number.isFinite(Number(latitude)) && Number.isFinite(Number(longitude))) {
    params.set("dropoff[latitude]", String(latitude));
    params.set("dropoff[longitude]", String(longitude));
    if (nickname) params.set("dropoff[nickname]", String(nickname));
  }
  return params.toString();
};

export const openUberRide = ({ latitude, longitude, nickname = "hydewest stay" } = {}) => {
  const query = buildQuery({ latitude, longitude, nickname });
  const appUrl = `uber://?${query}`;
  const webUrl = `https://m.uber.com/ul/?${query}`;
  const startedAt = Date.now();

  window.location.href = appUrl;
  window.setTimeout(() => {
    if (document.visibilityState === "visible" && Date.now() - startedAt < 2200) {
      window.location.href = webUrl;
    }
  }, 900);
};