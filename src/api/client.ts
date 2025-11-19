export enum ResponseErrorType {
  NOT_FOUND = "Not found",
  RATE_LIMITED = "Rate limited",
  UNHANDLED = "Unhandled",
}

export type ResponseError =
  | {type: ResponseErrorType.NOT_FOUND; message?: string}
  | {type: ResponseErrorType.RATE_LIMITED; message?: string}
  | {type: ResponseErrorType.UNHANDLED; message: string};

export async function withResponseError<T>(promise: Promise<T>): Promise<T> {
  return await promise.catch((error) => {
    console.error("ERROR!", error, typeof error);
    if (typeof error == "object" && "status" in error) {
      // This is a request.
      error = error as Response;
      if (error.status === 404) {
        throw {type: ResponseErrorType.NOT_FOUND};
      }
      if (error.status === 429) {
        throw {
          type: ResponseErrorType.RATE_LIMITED,
          message: "You've been rate limited. Please try again later.",
        };
      }
    }

    throw {
      type: ResponseErrorType.UNHANDLED,
      message: error.toString(),
    };
  });
}
