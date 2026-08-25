import type {ErrorComponentProps} from "@tanstack/react-router";
import {ApiErrorAlert} from "~/components/ApiErrorAlert";

export function RouteError({error, reset}: ErrorComponentProps) {
  return <ApiErrorAlert error={error} onRetry={reset} />;
}
