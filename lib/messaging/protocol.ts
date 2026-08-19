import { browser } from 'wxt/browser';
import type { FillPlan, FillResult } from '../fill/types';
import type { ExtractedJobContext } from '../jobContext/types';
import type { LlmSettings } from '../llm/types';
import type { ProfileContent } from '../profile/schema';
import type { PageContext, ScrapedField } from '../scrape/types';

/**
 * Every runtime message and its response, as discriminated unions. All
 * payloads must survive structured cloning (no Blobs, no DOM nodes).
 */

// ---- Requests handled by the background worker ----

export interface MapFormRequest {
  type: 'MAP_FORM';
  fields: ScrapedField[];
  pageContext: PageContext;
}

export interface StructureCvRequest {
  type: 'STRUCTURE_CV';
  rawText: string;
}

export interface GetCvFileRequest {
  type: 'GET_CV_FILE';
}

/**
 * Probe the given settings with a trivial completion. Settings travel in the
 * payload so the user can test before saving; the options page is extension
 * UI (not a content script), so carrying the key here stays inside the
 * trusted context.
 */
export interface TestConnectionRequest {
  type: 'TEST_CONNECTION';
  settings: LlmSettings;
}

export type BackgroundRequest =
  MapFormRequest | StructureCvRequest | GetCvFileRequest | TestConnectionRequest;

// ---- Requests handled by the content script ----

export interface ScrapeRequest {
  type: 'SCRAPE_REQUEST';
}

export interface ApplyPlanRequest {
  type: 'APPLY_PLAN';
  plan: FillPlan;
}

/** Answered only by the top frame — job descriptions live there. */
export interface ExtractJobContextRequest {
  type: 'EXTRACT_JOB_CONTEXT';
}

export type ContentRequest = ScrapeRequest | ApplyPlanRequest | ExtractJobContextRequest;

// ---- Responses ----

export interface ErrorPayload {
  message: string;
  kind:
    | 'auth'
    | 'rate-limit'
    | 'network'
    | 'provider'
    | 'empty'
    | 'invalid-output'
    | 'not-configured';
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: ErrorPayload };

export interface CvFilePayload {
  bytes: ArrayBuffer;
  fileName: string;
  mimeType: string;
}

export interface ScrapeResult {
  fields: ScrapedField[];
  pageContext: PageContext;
}

export type ResponseFor<M> = M extends MapFormRequest
  ? Result<FillPlan>
  : M extends StructureCvRequest
    ? Result<ProfileContent>
    : M extends GetCvFileRequest
      ? Result<CvFilePayload | null>
      : M extends TestConnectionRequest
        ? Result<string>
        : M extends ScrapeRequest
          ? ScrapeResult
          : M extends ApplyPlanRequest
            ? FillResult
            : M extends ExtractJobContextRequest
              ? ExtractedJobContext
              : never;

// ---- Typed send helpers ----

export function sendToBackground<M extends BackgroundRequest>(
  message: M,
): Promise<ResponseFor<M>> {
  return browser.runtime.sendMessage(message) as Promise<ResponseFor<M>>;
}

export function sendToTab<M extends ContentRequest>(
  tabId: number,
  message: M,
  frameId?: number,
): Promise<ResponseFor<M>> {
  return browser.tabs.sendMessage(
    tabId,
    message,
    frameId === undefined ? undefined : { frameId },
  ) as Promise<ResponseFor<M>>;
}

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function err<T>(error: ErrorPayload): Result<T> {
  return { ok: false, error };
}
