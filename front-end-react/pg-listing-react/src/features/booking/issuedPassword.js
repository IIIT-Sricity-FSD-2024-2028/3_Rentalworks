// An issued password is shown once with the matching checkout receipt.
let issuedPassword = null;

export function rememberIssuedPassword(bookingId, password) {
  issuedPassword = password ? { bookingId, password } : null;
}

export function readIssuedPassword(bookingId) {
  return issuedPassword && issuedPassword.bookingId === bookingId ? issuedPassword.password : null;
}

export function clearIssuedPassword() {
  issuedPassword = null;
}
