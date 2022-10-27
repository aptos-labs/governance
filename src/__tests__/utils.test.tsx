import {expect, it} from "@jest/globals";
import {octaToAptString, octaToAptnFormatter} from "../utils";

it("converts octa to apt correctly", () => {
  expect(octaToAptString("0")).toEqual("0");
  expect(octaToAptString("1")).toEqual("0.00000001");
  expect(octaToAptString("100")).toEqual("0.000001");
  expect(octaToAptString("10000")).toEqual("0.0001");
  expect(octaToAptString("10000000")).toEqual("0.1");
  expect(octaToAptString("100000000")).toEqual("1");
  expect(octaToAptString("110000000")).toEqual("1.1");
  expect(octaToAptString("110100000")).toEqual("1.1");
  expect(octaToAptString("10000000000000000")).toEqual("100,000,000");
  expect(octaToAptString("10000000000000001")).toEqual("100,000,000.");
  expect(octaToAptString("1000200345670001")).toEqual("10,002,003.45");
  expect(octaToAptString("1000200345000001")).toEqual("10,002,003.45");
  expect(octaToAptString("100531551369517")).toEqual("1,005,315.51");
  expect(octaToAptString("52431978984704074")).toEqual("524,319,789.84");
});

it("n formats octa to apt correctly", () => {
  expect(octaToAptnFormatter("0")).toEqual("0");
  expect(octaToAptnFormatter("1")).toEqual("0");
  expect(octaToAptnFormatter("100")).toEqual("0");
  expect(octaToAptnFormatter("10000")).toEqual("0");
  expect(octaToAptnFormatter("10000000")).toEqual("0");
  expect(octaToAptnFormatter("100000000")).toEqual("1");
  expect(octaToAptnFormatter("110000000")).toEqual("1");
  expect(octaToAptnFormatter("110100000")).toEqual("1");
  expect(octaToAptnFormatter("52431978984704")).toEqual("524.3K");
  expect(octaToAptnFormatter("10000000000000000")).toEqual("100M");
  expect(octaToAptnFormatter("10000000000000001")).toEqual("100M");
  expect(octaToAptnFormatter("1000200345670001")).toEqual("10M");
  expect(octaToAptnFormatter("100531551369517")).toEqual("1M");
  expect(octaToAptnFormatter("52431978984704074")).toEqual("524.3M");
});
