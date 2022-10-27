/**
 * Helper function for exhaustiveness checks.
 *
 * Hint: If this function is causing a type error, check to make sure that your
 * switch statement covers all cases!
 */
export function assertNever(x: never): never {
  throw new Error("Unexpected object: " + x);
}

/*
Converts a utf8 string encoded as hex back to string
if hex starts with 0x - ignore this part and start from the 3rd char (at index 2).
*/
export function hex_to_string(hex: string): string {
  var hexString = hex.toString();
  var str = "";
  let n = hex.startsWith("0x") ? 2 : 0;
  for (n; n < hexString.length; n += 2) {
    str += String.fromCharCode(parseInt(hexString.substring(n, n + 2), 16));
  }
  return str;
}

function getFormattedVotesStr(votes: string): string {
  return parseInt(votes).toLocaleString("en-US");
}

const APTOS_DECIMALS = 8;
const FIXED_DECIMAL_PLACES = 2;

function trimRight(rightSide: string) {
  while (rightSide.endsWith("0")) {
    rightSide = rightSide.slice(0, -1);
  }
  return rightSide;
}
/*
Converts OCTA to APT and returns APT as string representation 
*/
export function octaToAptString(amount: string, decimals?: number): string {
  // If it's zero, just return it
  if (amount == "0") {
    return amount;
  }

  const len = amount.length;
  decimals = decimals || APTOS_DECIMALS;

  // If length is less than decimals, pad with 0s to decimals length and return
  if (len <= decimals) {
    return "0." + (trimRight("0".repeat(decimals - len) + amount) || "0");
  }

  // Otherwise, insert decimal point at len - decimals
  const leftSide = BigInt(amount.slice(0, len - decimals)).toLocaleString(
    "en-US",
  );
  let rightSide = amount.slice(len - decimals);
  if (BigInt(rightSide) == BigInt(0)) {
    return leftSide;
  }

  // remove trailing 0s
  rightSide = trimRight(rightSide);

  if (FIXED_DECIMAL_PLACES && rightSide.length > FIXED_DECIMAL_PLACES) {
    rightSide = rightSide.slice(0, FIXED_DECIMAL_PLACES - rightSide.length);
  }

  return leftSide + "." + trimRight(rightSide);
}

/*
Converts OCTA to APT and returns APT as n formatted string representation 
52431978984704 OCTA -> 524.3K APT
*/
export function octaToAptnFormatter(amount: string, decimals?: number): string {
  // If length is less than decimals or it's zero, return 0
  const len = amount.length;
  decimals = decimals || APTOS_DECIMALS;
  if (len <= decimals || amount == "0") {
    return nFormatter(0);
  }

  // insert decimal point at len - decimals
  const leftSide = BigInt(amount.slice(0, len - decimals));
  let rightSide = amount.slice(len - decimals);
  if (BigInt(rightSide) == BigInt(0)) {
    return nFormatter(Number(leftSide));
  }

  // remove trailing 0s
  rightSide = trimRight(rightSide);

  if (FIXED_DECIMAL_PLACES && rightSide.length > FIXED_DECIMAL_PLACES) {
    rightSide = rightSide.slice(0, FIXED_DECIMAL_PLACES - rightSide.length);
  }

  return nFormatter(parseInt(leftSide + "." + trimRight(rightSide)));
}

function nFormatter(num: number) {
  const lookup = [
    {value: 1, symbol: ""},
    {value: 1e3, symbol: "K"},
    {value: 1e6, symbol: "M"},
    {value: 1e9, symbol: "G"},
    {value: 1e12, symbol: "T"},
    {value: 1e15, symbol: "P"},
    {value: 1e18, symbol: "E"},
  ];
  const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
  var item = lookup
    .slice()
    .reverse()
    .find(function (item) {
      return num >= item.value;
    });
  return item
    ? (num / item.value).toFixed(1).replace(rx, "$1") + item.symbol
    : "0";
}
