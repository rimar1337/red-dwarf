/* eslint-disable unused-imports/no-unused-imports */
/* eslint-disable simple-import-sort/imports */
/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { type HeadersMap, XRPCError } from "@atproto/xrpc";
import { type ValidationResult, BlobRef } from "@atproto/lexicon";
// import { CID } from 'multiformats/cid'
import { validate as _validate } from "../../../../lexicons";
import {
  type $Typed,
  is$typed as _is$typed,
  type OmitKey,
} from "../../../../util";
import type * as ComAtprotoLabelDefs from "../../../com/atproto/label/defs.js";

const is$typed = _is$typed,
  validate = _validate;
const id = "app.reddwarf.labelmerge.queryLabels";

export type QueryParams = {
  /** List of label subjects (strings). */
  s: string[];
  /** List of label sources (labeler DIDs) to filter on. */
  l: string[];
  /** If true then any errors will throw the entire query */
  strict?: boolean;
};
export type InputSchema = undefined;

export interface OutputSchema {
  labels: ComAtprotoLabelDefs.Label[];
  error?: Error[];
}

export interface CallOptions {
  signal?: AbortSignal;
  headers?: HeadersMap;
}

export interface Response {
  success: boolean;
  headers: HeadersMap;
  data: OutputSchema;
}

export function toKnownErr(e: any) {
  return e;
}

export interface Error {
  $type?: "app.reddwarf.labelmerge.queryLabels#error";
  s: string;
  e?: string;
}

const hashError = "error";

export function isError<V>(v: V) {
  return is$typed(v, id, hashError);
}

export function validateError<V>(v: V) {
  return validate<Error & V>(v, id, hashError);
}
