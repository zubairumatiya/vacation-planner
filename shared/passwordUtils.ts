export function isValidPassword(password: string): boolean {
  const regex =
    /^(?=.*[a-z])(?=.*\d)(?=.*[-!@#$%^&*()_+=[\]{}\\|`~:;"'<>,.?/])(?=.*[A-Z])[A-Za-z\d!@#$%^&*()_+=[\]{}\\|`~:;"'<>,.?/-]{8,72}$/;
  return regex.test(password);
}
