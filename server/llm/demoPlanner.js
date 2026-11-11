import { clockTime } from "../../shared/journeyTiming.js";
import { demoOptions } from "../demoOptions.js";
import { demoFareModes } from "../config.js";
export function createDemoPlanner(mockMode, mockStage) {
  function delay(milliseconds) {
    return new Promise((resolve) => setTimeout(resolve, milliseconds));
  }
  function mockPlan(tripDetails) {
    const destination =
      typeof tripDetails?.destination === "string" &&
      tripDetails.destination.trim()
        ? tripDetails.destination.trim()
        : "Sample destination";
    return {
      title: `A trip to ${destination}`,
      currency: tripDetails.currency,
      days: Array.from(
        {
          length: tripDetails.days,
        },
        (_, index) => ({
          label: `Day ${index + 1}`,
          stops:
            tripDetails.journey &&
            (index + 1 < tripDetails.journey.arrivalDay ||
              (index + 1 === tripDetails.days &&
                index + 1 === tripDetails.journey.arrivalDay &&
                tripDetails.journey.leaveByMinute !== null &&
                tripDetails.journey.arrivalMinute >=
                  tripDetails.journey.leaveByMinute))
              ? [
                  {
                    title: "Travel day",
                    category: "transport",
                    estCost: 0,
                    location: destination,
                  },
                ]
              : [
                  {
                    title: "Explore the city",
                    category: "sight",
                    estCost: 0,
                    description:
                      "Visit a well-known local landmark and nearby neighborhood.",
                    location: destination,
                    time: clockTime(
                      index + 1 === tripDetails.journey?.arrivalDay
                        ? tripDetails.journey.arrivalMinute
                        : Math.min(
                            540,
                            index + 1 === tripDetails.days
                              ? (tripDetails.journey?.leaveByMinute ?? 540)
                              : 540,
                          ),
                    ),
                  },
                ],
        }),
      ),
      packingList: [],
    };
  }
  async function generate(tripDetails, isOptions) {
    if (isOptions) {
      if (mockMode === "options-bad-shape") {
        return {
          status: 200,
          body: {
            unexpected: true,
          },
        };
      }
      if (mockMode === "options-empty") {
        return {
          status: 200,
        };
      }
      if (
        (demoFareModes.has(mockMode) && mockStage === "plan") ||
        [
          "demo",
          "jitter",
          "slow",
          "wrong-days",
          "geo-down",
          "geo-slow",
          "geo-empty",
          "fares-bad-json",
          "fares-fail",
          "journeys-empty",
        ].includes(mockMode)
      ) {
        if (mockMode === "jitter" && mockStage !== "plan")
          await delay(Math.random() * 5000);
        if (mockMode === "slow" && mockStage !== "plan") await delay(40000);
        return {
          status: 200,
          body: demoOptions(tripDetails),
        };
      }
    }
    switch (mockMode) {
      case "wrong-days":
        return {
          status: 200,
          body: mockPlan({
            ...tripDetails,
            days: tripDetails.days === 1 ? 2 : tripDetails.days - 1,
          }),
        };
        return true;
      case "geo-down":
      case "geo-slow":
      case "geo-empty":
      case "fares-bad-json":
      case "fares-fail":
      case "journeys-empty":
      case "demo":
        return {
          status: 200,
          body: mockPlan(tripDetails),
        };
        return true;
      case "jitter":
        await delay(Math.floor(Math.random() * 5_000));
        return {
          status: 200,
          body: mockPlan(tripDetails),
        };
        return true;
      case "slow":
        await delay(40_000);
        return {
          status: 200,
          body: mockPlan(tripDetails),
        };
        return true;
      case "bad-json":
        return {
          status: 200,
          raw: '{"invalid":',
          contentType: "application/json",
        };
        return true;
      case "bad-shape":
        return {
          status: 200,
          body: {
            unexpected: true,
          },
        };
        return true;
      case "empty":
        return {
          status: 200,
        };
        return true;
      case "fail":
        return {
          status: 500,
          body: {
            error: "Mock server failure.",
          },
        };
        return true;
      default:
        return null;
    }
  }
  return {
    generate,
  };
}
