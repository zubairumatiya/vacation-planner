export function isValidEmail(email: string): boolean {
  const regex =
    /^\w+[\w.-]*@[A-Za-z0-9]+(?!.*\.\.)(?!.*(\.-|-\.))\.[A-Za-z0-9.-]*[A-Za-z0-9]+$/;
  // /^\w+[\w.-]*@[A-Za-z0-9]+(?!.*\.\.)(?!.*(\.-|-\.))\.([A-Za-z0-9.-]*[A-Za-z0-9]+ | [A-Za-z0-9]+)$/;
  return regex.test(email);
}
