import "@testing-library/jest-dom";
import { expect } from "vitest";
import * as matcherExtensions from "@testing-library/jest-dom/matchers";


expect.extend(matcherExtensions);