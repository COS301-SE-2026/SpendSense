import "@testing-library/jest-dom";
import { expect } from "vitest";
import { beforeEach,afterEach } from "node:test";
import {vi} from "vitest"
import * as matcherExtensions from "@testing-library/jest-dom/matchers";


expect.extend(matcherExtensions);