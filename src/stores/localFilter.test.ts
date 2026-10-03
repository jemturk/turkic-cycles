import * as Location from "expo-location";

import { useLocalFilter } from "./localFilter";

jest.mock("expo-location", () => ({
  Accuracy: { Balanced: 3 },
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
}));

const requestPermission = Location.requestForegroundPermissionsAsync as jest.Mock;
const getPosition = Location.getCurrentPositionAsync as jest.Mock;

beforeEach(() => {
  useLocalFilter.setState({ enabled: false, origin: null, status: "idle" });
});

describe("useLocalFilter.setEnabled", () => {
  it("turns on with the device position once permission is granted", async () => {
    requestPermission.mockResolvedValue({ status: "granted" });
    getPosition.mockResolvedValue({ coords: { latitude: 35.73, longitude: -78.85 } });

    await useLocalFilter.getState().setEnabled(true);

    expect(useLocalFilter.getState()).toMatchObject({
      enabled: true,
      status: "idle",
      origin: { latitude: 35.73, longitude: -78.85 },
    });
  });

  it("stays off and reports it when permission is denied", async () => {
    requestPermission.mockResolvedValue({ status: "denied" });

    await useLocalFilter.getState().setEnabled(true);

    expect(getPosition).not.toHaveBeenCalled();
    expect(useLocalFilter.getState()).toMatchObject({ enabled: false, status: "denied" });
  });

  it("stays off and reports it when the position can't be read", async () => {
    requestPermission.mockResolvedValue({ status: "granted" });
    getPosition.mockRejectedValue(new Error("timeout"));

    await useLocalFilter.getState().setEnabled(true);

    expect(useLocalFilter.getState()).toMatchObject({ enabled: false, status: "unavailable" });
  });

  it("turns off without touching location", async () => {
    useLocalFilter.setState({ enabled: true, origin: { latitude: 1, longitude: 2 } });

    await useLocalFilter.getState().setEnabled(false);

    expect(requestPermission).not.toHaveBeenCalled();
    expect(useLocalFilter.getState()).toMatchObject({ enabled: false, status: "idle" });
  });
});
